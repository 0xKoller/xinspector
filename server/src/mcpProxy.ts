import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  isJSONRPCRequest,
  JSONRPCMessage,
} from "@modelcontextprotocol/sdk/types.js";

function onClientError(error: Error) {
  console.error("Error from inspector client:", error);
}

function onServerError(error: Error) {
  if (error?.cause && JSON.stringify(error.cause).includes("ECONNREFUSED")) {
    console.error("Connection refused. Is the MCP server running?");
  } else if (error.message && error.message.includes("404")) {
    console.error("Error accessing endpoint (HTTP 404)");
  } else {
    console.error("Error from MCP server:", error);
  }
}

/**
 * Checks if a JSON-RPC response contains x402 payment requirements
 * embedded in a tool call result.
 */
function extractX402FromMessage(
  message: JSONRPCMessage,
): { x402Version: number; accepts: unknown[] } | null {
  // Must be a JSON-RPC response (has "result", no "error")
  if (!("result" in message) || "error" in message) return null;

  const result = (message as Record<string, unknown>).result;
  if (!result || typeof result !== "object") return null;

  // Check if the result itself has x402 info (direct embedding)
  const resultObj = result as Record<string, unknown>;
  if (resultObj.x402Version && Array.isArray(resultObj.accepts)) {
    return resultObj as { x402Version: number; accepts: unknown[] };
  }

  // Check inside content array (MCP tool result format)
  if (Array.isArray(resultObj.content)) {
    for (const item of resultObj.content) {
      if (item && typeof item === "object" && "text" in item) {
        try {
          const parsed = JSON.parse(item.text as string);
          if (parsed.x402Version && Array.isArray(parsed.accepts)) {
            return parsed;
          }
        } catch {
          // Not JSON, skip
        }
      }
    }
  }

  return null;
}

export interface X402ProxyHandler {
  /**
   * Called when an x402 payment-required response is detected.
   * Signs the payment and returns the encoded payment header value
   * to inject into the JSON-RPC message's _meta field.
   */
  handlePayment: (paymentInfo: {
    x402Version: number;
    accepts: unknown[];
  }) => Promise<string | null>;
}

export default function mcpProxy({
  transportToClient,
  transportToServer,
  x402Handler,
}: {
  transportToClient: Transport;
  transportToServer: Transport;
  x402Handler?: X402ProxyHandler;
}) {
  let transportToClientClosed = false;
  let transportToServerClosed = false;

  let reportedServerSession = false;

  // Store pending requests by id for x402 retry
  const pendingRequests = new Map<string | number, JSONRPCMessage>();
  // Track which requests have already been retried (max 1 retry per request)
  const retriedRequests = new Set<string | number>();

  transportToClient.onmessage = (message) => {
    // Store requests for potential x402 retry
    if (x402Handler && isJSONRPCRequest(message)) {
      pendingRequests.set(
        message.id,
        JSON.parse(JSON.stringify(message)) as JSONRPCMessage,
      );
    }

    transportToServer.send(message).catch((error) => {
      // Send error response back to client if it was a request (has id) and connection is still open
      if (isJSONRPCRequest(message) && !transportToClientClosed) {
        const errorResponse = {
          jsonrpc: "2.0" as const,
          id: message.id,
          error: {
            code: -32001,
            message: error.cause
              ? `${error.message} (cause: ${error.cause})`
              : error.message,
            data: error,
          },
        };
        transportToClient.send(errorResponse).catch(onClientError);
      }
    });
  };

  transportToServer.onmessage = async (message) => {
    if (!reportedServerSession) {
      if (transportToServer.sessionId) {
        // Can only report for StreamableHttp
        console.error(
          "Proxy  <-> Server sessionId: " + transportToServer.sessionId,
        );
      }
      reportedServerSession = true;
    }

    // Check for x402 payment requirements in server response
    if (x402Handler && "id" in message) {
      const requestId = (message as Record<string, unknown>).id as
        | string
        | number;
      const x402Info = extractX402FromMessage(message);
      if (x402Info && !retriedRequests.has(requestId)) {
        const originalRequest = pendingRequests.get(requestId);
        if (originalRequest) {
          console.log(
            "x402: Payment required detected in tool response, processing...",
          );
          try {
            const paymentValue = await x402Handler.handlePayment(x402Info);
            if (paymentValue) {
              console.log(
                "x402: Payment signed, retrying tool call with _meta payment...",
              );
              // Mark as retried to prevent infinite loops
              retriedRequests.add(requestId);
              // Inject payment into the JSON-RPC message's params._meta
              // The server reads: message.params._meta["x402/payment"]
              const retryRequest = JSON.parse(
                JSON.stringify(originalRequest),
              ) as Record<string, unknown>;
              if (
                retryRequest.params &&
                typeof retryRequest.params === "object"
              ) {
                const params = retryRequest.params as Record<string, unknown>;
                if (!params._meta || typeof params._meta !== "object") {
                  params._meta = {};
                }
                (params._meta as Record<string, unknown>)["x402/payment"] =
                  paymentValue;
              }
              await transportToServer.send(retryRequest as JSONRPCMessage);
              // Don't forward the 402 response to the client; wait for the retry response
              return;
            }
          } catch (error) {
            console.error("x402: Payment handling failed:", error);
            // Fall through to forward the original response
          }
        }
      } else if (x402Info && retriedRequests.has(requestId)) {
        console.error(
          "x402: Payment retry failed — server still requires payment. Check wallet USDC balance on Base Sepolia.",
        );
      }
      // Clean up
      pendingRequests.delete(requestId);
      retriedRequests.delete(requestId);
    }

    transportToClient.send(message).catch(onClientError);
  };

  transportToClient.onclose = () => {
    if (transportToServerClosed) {
      return;
    }

    transportToClientClosed = true;
    transportToServer.close().catch(onServerError);
  };

  transportToServer.onclose = () => {
    if (transportToClientClosed) {
      return;
    }
    transportToServerClosed = true;
    transportToClient.close().catch(onClientError);
  };

  transportToClient.onerror = onClientError;
  transportToServer.onerror = onServerError;
}
