#!/usr/bin/env node

import cors from "cors";
import { parseArgs } from "node:util";
import { parse as shellParseArgs } from "shell-quote";
import nodeFetch, { Headers as NodeHeaders } from "node-fetch";

// Type-compatible wrappers for node-fetch to work with browser-style types
const fetch = nodeFetch;
const Headers = NodeHeaders;

import {
  SSEClientTransport,
  SseError,
} from "@modelcontextprotocol/sdk/client/sse.js";
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import express from "express";
import rateLimit from "express-rate-limit";
import { findActualExecutable } from "spawn-rx";
import mcpProxy, { X402ProxyHandler } from "./mcpProxy.js";
import { randomUUID, randomBytes, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const DEFAULT_MCP_PROXY_LISTEN_PORT = "6277";

const sandboxRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 /sandbox requests per windowMs
});

const defaultEnvironment = {
  ...getDefaultEnvironment(),
  ...(process.env.MCP_ENV_VARS ? JSON.parse(process.env.MCP_ENV_VARS) : {}),
};

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    env: { type: "string", default: "" },
    args: { type: "string", default: "" },
    command: { type: "string", default: "" },
    transport: { type: "string", default: "" },
    "server-url": { type: "string", default: "" },
  },
});

/**
 * Helper function to detect 401 Unauthorized errors from various transport types.
 * StreamableHTTPClientTransport throws a generic Error with "HTTP 401" in the message
 * when there's no authProvider configured, while SSEClientTransport throws SseError.
 */
const is401Error = (error: unknown): boolean => {
  if (error instanceof SseError && error.code === 401) return true;
  if (error instanceof StreamableHTTPError && error.code === 401) return true;
  if (
    error instanceof Error &&
    (error.message.includes("HTTP 401") || error.message.includes("(401)"))
  )
    return true;
  return false;
};

// Function to get HTTP headers.
const getHttpHeaders = (req: express.Request): Record<string, string> => {
  const headers: Record<string, string> = {};

  // Iterate over all headers in the request
  for (const key in req.headers) {
    const lowerKey = key.toLowerCase();

    // Check if the header is one we want to forward
    if (
      lowerKey.startsWith("mcp-") ||
      lowerKey === "authorization" ||
      lowerKey === "last-event-id"
    ) {
      // Exclude the proxy's own authentication header, session ID header, and x402 config headers
      if (
        lowerKey !== "x-mcp-proxy-auth" &&
        lowerKey !== "mcp-session-id" &&
        !lowerKey.startsWith("x-x402-")
      ) {
        const value = req.headers[key];

        if (typeof value === "string") {
          // If the value is a string, use it directly
          headers[key] = value;
        } else if (Array.isArray(value)) {
          // If the value is an array, use the last element
          const lastValue = value.at(-1);
          if (lastValue !== undefined) {
            headers[key] = lastValue;
          }
        }
        // If value is undefined, it's skipped, which is correct.
      }
    }
  }

  // Handle the custom auth header separately. We expect `x-custom-auth-header`
  // to be a string containing the name of the actual authentication header.
  const customAuthHeaderName = req.headers["x-custom-auth-header"];
  if (typeof customAuthHeaderName === "string") {
    const lowerCaseHeaderName = customAuthHeaderName.toLowerCase();
    const value = req.headers[lowerCaseHeaderName];

    if (typeof value === "string") {
      headers[customAuthHeaderName] = value;
    } else if (Array.isArray(value)) {
      // If the actual auth header was sent multiple times, use the last value.
      const lastValue = value.at(-1);
      if (lastValue !== undefined) {
        headers[customAuthHeaderName] = lastValue;
      }
    }
  }

  // Handle multiple custom headers (new approach)
  if (req.headers["x-custom-auth-headers"] !== undefined) {
    try {
      const customHeaderNames = JSON.parse(
        req.headers["x-custom-auth-headers"] as string,
      ) as string[];
      if (Array.isArray(customHeaderNames)) {
        customHeaderNames.forEach((headerName) => {
          const lowerCaseHeaderName = headerName.toLowerCase();
          if (req.headers[lowerCaseHeaderName] !== undefined) {
            const value = req.headers[lowerCaseHeaderName];
            headers[headerName] = Array.isArray(value)
              ? value[value.length - 1]
              : value;
          }
        });
      }
    } catch (error) {
      console.warn("Failed to parse x-custom-auth-headers:", error);
    }
  }
  return headers;
};

/**
 * Extracts x402 payment protocol configuration from request headers.
 */
const getX402Config = (
  req: express.Request,
): { enabled: boolean; privateKey: string | null } => {
  const enabled = req.headers["x-x402-enabled"] === "true";
  const privateKey = (req.headers["x-x402-private-key"] as string) || null;
  return { enabled, privateKey };
};

/**
 * Updates a headers object in-place, preserving the original Accept header.
 * This is necessary to ensure that transports holding a reference to the headers
 * object see the updates.
 * @param currentHeaders The headers object to update.
 * @param newHeaders The new headers to apply.
 */
const updateHeadersInPlace = (
  currentHeaders: Record<string, string>,
  newHeaders: Record<string, string>,
) => {
  // Preserve the Accept header, which is set at transport creation and
  // is not present in subsequent client requests.
  const accept = currentHeaders["Accept"];

  // Clear the old headers and apply the new ones.
  Object.keys(currentHeaders).forEach((key) => delete currentHeaders[key]);
  Object.assign(currentHeaders, newHeaders);

  // Restore the Accept header.
  if (accept) {
    currentHeaders["Accept"] = accept;
  }
};

const app = express();
app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Expose-Headers", "mcp-session-id");
  next();
});

const webAppTransports: Map<string, Transport> = new Map<string, Transport>(); // Web app transports by web app sessionId
const serverTransports: Map<string, Transport> = new Map<string, Transport>(); // Server Transports by web app sessionId
const sessionHeaderHolders: Map<string, { headers: HeadersInit }> = new Map(); // For dynamic header updates

// Use provided token from environment or generate a new one
const sessionToken =
  process.env.MCP_PROXY_AUTH_TOKEN || randomBytes(32).toString("hex");
const authDisabled = !!process.env.DANGEROUSLY_OMIT_AUTH;

// Origin validation middleware to prevent DNS rebinding attacks
const originValidationMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const origin = req.headers.origin;

  // Default origins based on CLIENT_PORT or use environment variable
  const clientPort = process.env.CLIENT_PORT || "6274";
  const defaultOrigin = `http://localhost:${clientPort}`;
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
    defaultOrigin,
  ];

  if (origin && !allowedOrigins.includes(origin)) {
    console.error(`Invalid origin: ${origin}`);
    res.status(403).json({
      error: "Forbidden - invalid origin",
      message:
        "Request blocked to prevent DNS rebinding attacks. Configure allowed origins via environment variable.",
    });
    return;
  }
  next();
};

const authMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (authDisabled) {
    return next();
  }

  const sendUnauthorized = () => {
    res.status(401).json({
      error: "Unauthorized",
      message:
        "Authentication required. Use the session token shown in the console when starting the server.",
    });
  };

  const authHeader = req.headers["x-mcp-proxy-auth"];
  const authHeaderValue = Array.isArray(authHeader)
    ? authHeader[0]
    : authHeader;

  if (!authHeaderValue || !authHeaderValue.startsWith("Bearer ")) {
    sendUnauthorized();
    return;
  }

  const providedToken = authHeaderValue.substring(7); // Remove 'Bearer ' prefix
  const expectedToken = sessionToken;

  // Convert to buffers for timing-safe comparison
  const providedBuffer = Buffer.from(providedToken);
  const expectedBuffer = Buffer.from(expectedToken);

  // Check length first to prevent timing attacks
  if (providedBuffer.length !== expectedBuffer.length) {
    sendUnauthorized();
    return;
  }

  // Perform timing-safe comparison
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    sendUnauthorized();
    return;
  }

  next();
};

/**
 * Converts a Node.js ReadableStream to a web-compatible ReadableStream
 * This is necessary for the EventSource polyfill which expects web streams
 */
const createWebReadableStream = (nodeStream: any): ReadableStream => {
  let closed = false;
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: any) => {
        if (!closed) {
          controller.enqueue(chunk);
        }
      });
      nodeStream.on("end", () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      });
      nodeStream.on("error", (err: any) => {
        if (!closed) {
          closed = true;
          controller.error(err);
        }
      });
    },
    cancel() {
      closed = true;
      nodeStream.destroy();
    },
  });
};

/**
 * Creates a `fetch` function that merges dynamic session headers with the
 * headers from the actual request, ensuring that request-specific headers like
 * `Content-Type` are preserved. For SSE requests, it also converts Node.js
 * streams to web-compatible streams.
 */
/**
 * Initializes x402 payment client from config.
 */
const createX402Client = (x402Config?: {
  enabled: boolean;
  privateKey: string | null;
}): {
  client: InstanceType<typeof x402Client> | null;
  http: InstanceType<typeof x402HTTPClient> | null;
} => {
  if (!x402Config?.enabled || !x402Config.privateKey) {
    return { client: null, http: null };
  }
  try {
    const evmSigner = privateKeyToAccount(
      x402Config.privateKey as `0x${string}`,
    );
    const client = new x402Client();
    registerExactEvmScheme(client, { signer: evmSigner });
    const http = new x402HTTPClient(client);
    console.log("x402: Payment client initialized");
    return { client, http };
  } catch (error) {
    console.error("x402: Failed to initialize payment client:", error);
    return { client: null, http: null };
  }
};

const createCustomFetch = (
  headerHolder: { headers: HeadersInit },
  x402: {
    client: InstanceType<typeof x402Client> | null;
    http: InstanceType<typeof x402HTTPClient> | null;
  },
) => {
  const x402PaymentClient = x402.client;
  const x402Http = x402.http;

  const doFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
    extraHeaders?: Record<string, string>,
  ): Promise<Response> => {
    // Determine the headers from the original request/init.
    // The SDK may pass a Request object or a URL and an init object.
    const originalHeaders =
      input instanceof Request ? input.headers : init?.headers;

    // Start with our dynamic session headers.
    const finalHeaders = new Headers(headerHolder.headers);

    // Merge the SDK's request-specific headers, letting them overwrite.
    // This is crucial for preserving Content-Type on POST requests.
    new Headers(originalHeaders).forEach((value, key) => {
      finalHeaders.set(key, value);
    });

    // Merge any extra headers (e.g., x402 payment signature on retry)
    if (extraHeaders) {
      for (const [key, value] of Object.entries(extraHeaders)) {
        finalHeaders.set(key, value);
      }
    }

    // Convert Headers to a plain object for node-fetch compatibility
    const headersObject: Record<string, string> = {};
    finalHeaders.forEach((value, key) => {
      headersObject[key] = value;
    });

    // Log x402 payment headers if present
    const paymentHeader =
      headersObject["x-payment"] || headersObject["payment-signature"];
    if (paymentHeader) {
      console.log(
        `x402: Sending request with payment header (${paymentHeader.substring(0, 50)}...)`,
      );
      console.log("x402: All outgoing headers:", Object.keys(headersObject));
    }

    // Get the response from node-fetch (cast input and init to handle type differences)
    const response = await fetch(
      input as any,
      { ...init, headers: headersObject } as any,
    );

    // Log response status when x402 payment was attempted
    if (paymentHeader) {
      console.log(`x402: MCP server response status: ${response.status}`);
    }

    // Check if this is an SSE request by looking at the Accept header
    const acceptHeader = finalHeaders.get("Accept");
    const isSSE = acceptHeader?.includes("text/event-stream");

    if (isSSE && response.body) {
      // For SSE requests, we need to convert the Node.js stream to a web ReadableStream
      // because the EventSource polyfill expects web-compatible streams
      const webStream = createWebReadableStream(response.body);

      // Create a new response with the web-compatible stream
      // Convert node-fetch headers to plain object for web Response compatibility
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value: string, key: string) => {
        responseHeaders[key] = value;
      });

      return new Response(webStream, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      }) as Response;
    }

    // For non-SSE requests, return the response as-is (cast to handle type differences)
    return response as unknown as Response;
  };

  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const response = await doFetch(input, init);

    // If x402 is not enabled or response is not 402, return as-is
    if (!x402PaymentClient || !x402Http || response.status !== 402) {
      return response;
    }

    // Handle 402 Payment Required — sign payment and retry
    console.log("x402: Received 402 Payment Required, processing payment...");
    try {
      // Parse payment requirements from response body and headers
      const getHeader = (name: string) => response.headers.get(name);
      let body: unknown;
      try {
        const responseText = await response.text();
        if (responseText) {
          body = JSON.parse(responseText);
        }
      } catch {
        /* body parsing is optional — requirements may be in headers only */
      }

      const paymentRequired = x402Http.getPaymentRequiredResponse(
        getHeader,
        body,
      );
      console.log("x402: Payment requirements parsed, creating payload...");

      // Create signed payment payload
      const paymentPayload =
        await x402PaymentClient.createPaymentPayload(paymentRequired);
      const paymentHeaders =
        x402Http.encodePaymentSignatureHeader(paymentPayload);
      console.log("x402: Payment signed, retrying request with signature...");

      // Retry the original request with payment signature headers
      const retryResponse = await doFetch(input, init, paymentHeaders);
      console.log(`x402: Retry response status: ${retryResponse.status}`);
      return retryResponse;
    } catch (error) {
      console.error("x402: Payment handling failed:", error);
      // Re-fetch the original request so the 402 body is available to the caller
      return doFetch(input, init);
    }
  };
};

const createTransport = async (
  req: express.Request,
): Promise<{
  transport: Transport;
  headerHolder?: { headers: HeadersInit };
  x402?: {
    client: InstanceType<typeof x402Client> | null;
    http: InstanceType<typeof x402HTTPClient> | null;
  };
}> => {
  const query = req.query;
  console.log("Query parameters:", JSON.stringify(query));

  const transportType = query.transportType as string;
  const x402Config = getX402Config(req);
  const x402 = createX402Client(x402Config);

  if (transportType === "stdio") {
    const command = (query.command as string).trim();
    const origArgs = shellParseArgs(query.args as string) as string[];
    const queryEnv = query.env ? JSON.parse(query.env as string) : {};
    const env = { ...defaultEnvironment, ...process.env, ...queryEnv };

    const { cmd, args } = findActualExecutable(command, origArgs);

    console.log(`STDIO transport: command=${cmd}, args=${args}`);

    const transport = new StdioClientTransport({
      command: cmd,
      args,
      env,
      stderr: "pipe",
    });

    await transport.start();
    return { transport };
  } else if (transportType === "sse") {
    const url = query.url as string;

    const headers = getHttpHeaders(req);
    headers["Accept"] = "text/event-stream";
    const headerHolder = { headers };

    console.log(
      `SSE transport: url=${url}, headers=${JSON.stringify(headers)}`,
    );

    const transport = new SSEClientTransport(new URL(url), {
      eventSourceInit: {
        fetch: createCustomFetch(headerHolder, x402),
      },
      requestInit: {
        headers: headerHolder.headers,
      },
    });
    await transport.start();
    return { transport, headerHolder, x402 };
  } else if (transportType === "streamable-http") {
    const headers = getHttpHeaders(req);
    headers["Accept"] = "text/event-stream, application/json";
    const headerHolder = { headers };

    const transport = new StreamableHTTPClientTransport(
      new URL(query.url as string),
      {
        // Pass a custom fetch to inject the latest headers on each request
        fetch: createCustomFetch(headerHolder, x402),
      },
    );
    await transport.start();
    return { transport, headerHolder, x402 };
  } else {
    console.error(`Invalid transport type: ${transportType}`);
    throw new Error("Invalid transport type specified");
  }
};

app.get(
  "/mcp",
  originValidationMiddleware,
  authMiddleware,
  async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string;
    console.log(`Received GET message for sessionId ${sessionId}`);

    const headerHolder = sessionHeaderHolders.get(sessionId);
    if (headerHolder) {
      updateHeadersInPlace(
        headerHolder.headers as Record<string, string>,
        getHttpHeaders(req),
      );
    }

    try {
      const transport = webAppTransports.get(
        sessionId,
      ) as StreamableHTTPServerTransport;
      if (!transport) {
        res.status(404).end("Session not found");
        return;
      } else {
        await transport.handleRequest(req, res);
      }
    } catch (error) {
      console.error("Error in /mcp route:", error);
      res.status(500).json(error);
    }
  },
);

app.post(
  "/mcp",
  originValidationMiddleware,
  authMiddleware,
  async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId) {
      console.log(`Received POST message for sessionId ${sessionId}`);
      const headerHolder = sessionHeaderHolders.get(sessionId);
      if (headerHolder) {
        updateHeadersInPlace(
          headerHolder.headers as Record<string, string>,
          getHttpHeaders(req),
        );
      }

      try {
        const transport = webAppTransports.get(
          sessionId,
        ) as StreamableHTTPServerTransport;
        if (!transport) {
          res.status(404).end("Transport not found for sessionId " + sessionId);
        } else {
          await (transport as StreamableHTTPServerTransport).handleRequest(
            req,
            res,
          );
        }
      } catch (error) {
        console.error("Error in /mcp route:", error);
        res.status(500).json(error);
      }
    } else {
      console.log("New StreamableHttp connection request");
      try {
        const {
          transport: serverTransport,
          headerHolder,
          x402: x402Clients,
        } = await createTransport(req);

        const webAppTransport = new StreamableHTTPServerTransport({
          sessionIdGenerator: randomUUID,
          onsessioninitialized: (sessionId) => {
            webAppTransports.set(sessionId, webAppTransport);
            serverTransports.set(sessionId, serverTransport!); // eslint-disable-line @typescript-eslint/no-non-null-assertion
            if (headerHolder) {
              sessionHeaderHolders.set(sessionId, headerHolder);
            }
            console.log("Client <-> Proxy  sessionId: " + sessionId);
          },
          onsessionclosed: (sessionId) => {
            webAppTransports.delete(sessionId);
            serverTransports.delete(sessionId);
            sessionHeaderHolders.delete(sessionId);
          },
        });
        console.log("Created StreamableHttp client transport");

        await webAppTransport.start();

        // Build x402 proxy handler if payment client is available
        let x402Handler: X402ProxyHandler | undefined;
        if (x402Clients?.client && x402Clients?.http) {
          const { client: x402c, http: x402h } = x402Clients;
          x402Handler = {
            handlePayment: async (paymentInfo) => {
              // Parse payment requirements using the x402 HTTP client
              const paymentRequired = x402h.getPaymentRequiredResponse(
                () => null,
                paymentInfo,
              );
              // Sign the payment
              const paymentPayload =
                await x402c.createPaymentPayload(paymentRequired);
              // Encode as the payment header value (base64 JSON)
              const paymentHeaders =
                x402h.encodePaymentSignatureHeader(paymentPayload);
              // Return the encoded payment value for injection into _meta
              const paymentValue =
                paymentHeaders["X-PAYMENT"] ??
                paymentHeaders["PAYMENT-SIGNATURE"] ??
                Object.values(paymentHeaders)[0];
              console.log(
                "x402: Payment signed, value length:",
                paymentValue?.length,
              );
              return paymentValue ?? null;
            },
          };
        }

        mcpProxy({
          transportToClient: webAppTransport,
          transportToServer: serverTransport,
          x402Handler,
        });

        await (webAppTransport as StreamableHTTPServerTransport).handleRequest(
          req,
          res,
          req.body,
        );
      } catch (error) {
        if (is401Error(error)) {
          console.error(
            "Received 401 Unauthorized from MCP server:",
            error instanceof Error ? error.message : error,
          );
          res.status(401).json(error);
          return;
        }
        console.error("Error in /mcp POST route:", error);
        res.status(500).json(error);
      }
    }
  },
);

app.delete(
  "/mcp",
  originValidationMiddleware,
  authMiddleware,
  async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    console.log(`Received DELETE message for sessionId ${sessionId}`);
    if (sessionId) {
      try {
        const serverTransport = serverTransports.get(
          sessionId,
        ) as StreamableHTTPClientTransport;
        if (!serverTransport) {
          res.status(404).end("Transport not found for sessionId " + sessionId);
        } else {
          await serverTransport.terminateSession();
          await serverTransport.close();
          webAppTransports.delete(sessionId);
          serverTransports.delete(sessionId);
          sessionHeaderHolders.delete(sessionId);
          console.log(`Transports removed for sessionId ${sessionId}`);
        }
        res.status(200).end();
      } catch (error) {
        console.error("Error in /mcp route:", error);
        res.status(500).json(error);
      }
    }
  },
);

app.get(
  "/stdio",
  originValidationMiddleware,
  authMiddleware,
  async (req, res) => {
    try {
      console.log("New STDIO connection request");
      const { transport: serverTransport } = await createTransport(req);

      const proxyFullAddress = (req.query.proxyFullAddress as string) || "";
      const prefix = proxyFullAddress || "";
      const endpoint = `${prefix}/message`;

      const webAppTransport = new SSEServerTransport(endpoint, res);
      webAppTransports.set(webAppTransport.sessionId, webAppTransport);
      console.log("Created client transport");

      serverTransports.set(webAppTransport.sessionId, serverTransport);
      console.log("Created server transport");

      await webAppTransport.start();

      (serverTransport as StdioClientTransport).stderr!.on("data", (chunk) => {
        if (chunk.toString().includes("MODULE_NOT_FOUND")) {
          // Server command not found, remove transports
          const message = "Command not found, transports removed";
          webAppTransport.send({
            jsonrpc: "2.0",
            method: "notifications/message",
            params: {
              level: "emergency",
              logger: "proxy",
              data: {
                message,
              },
            },
          });
          webAppTransport.close();
          serverTransport.close();
          webAppTransports.delete(webAppTransport.sessionId);
          serverTransports.delete(webAppTransport.sessionId);
          sessionHeaderHolders.delete(webAppTransport.sessionId);
          console.error(message);
        } else {
          // Inspect message and attempt to assign a RFC 5424 Syslog Protocol level
          let level;
          let message = chunk.toString().trim();
          let ucMsg = chunk.toString().toUpperCase();
          if (ucMsg.includes("DEBUG")) {
            level = "debug";
          } else if (ucMsg.includes("INFO")) {
            level = "info";
          } else if (ucMsg.includes("NOTICE")) {
            level = "notice";
          } else if (ucMsg.includes("WARN")) {
            level = "warning";
          } else if (ucMsg.includes("ERROR")) {
            level = "error";
          } else if (ucMsg.includes("CRITICAL")) {
            level = "critical";
          } else if (ucMsg.includes("ALERT")) {
            level = "alert";
          } else if (ucMsg.includes("EMERGENCY")) {
            level = "emergency";
          } else if (ucMsg.includes("SIGINT")) {
            message = "SIGINT received. Server shutdown.";
            level = "emergency";
          } else if (ucMsg.includes("SIGHUP")) {
            message = "SIGHUP received. Server shutdown.";
            level = "emergency";
          } else if (ucMsg.includes("SIGTERM")) {
            message = "SIGTERM received. Server shutdown.";
            level = "emergency";
          } else {
            level = "info";
          }
          webAppTransport.send({
            jsonrpc: "2.0",
            method: "notifications/message",
            params: {
              level,
              logger: "stdio",
              data: {
                message,
              },
            },
          });
        }
      });

      mcpProxy({
        transportToClient: webAppTransport,
        transportToServer: serverTransport,
      });
    } catch (error) {
      if (is401Error(error)) {
        console.error(
          "Received 401 Unauthorized from MCP server. Authentication failure.",
        );
        res.status(401).json(error);
        return;
      }
      console.error("Error in /stdio route:", error);
      res.status(500).json(error);
    }
  },
);

app.get(
  "/sse",
  originValidationMiddleware,
  authMiddleware,
  async (req, res) => {
    try {
      console.log(
        "New SSE connection request. NOTE: The SSE transport is deprecated and has been replaced by StreamableHttp",
      );
      const {
        transport: serverTransport,
        headerHolder,
        x402: x402ClientsSSE,
      } = await createTransport(req);

      const proxyFullAddress = (req.query.proxyFullAddress as string) || "";
      const prefix = proxyFullAddress || "";
      const endpoint = `${prefix}/message`;

      const webAppTransport = new SSEServerTransport(endpoint, res);
      webAppTransports.set(webAppTransport.sessionId, webAppTransport);
      console.log("Created client transport");

      serverTransports.set(webAppTransport.sessionId, serverTransport!); // eslint-disable-line @typescript-eslint/no-non-null-assertion
      if (headerHolder) {
        sessionHeaderHolders.set(webAppTransport.sessionId, headerHolder);
      }
      console.log("Created server transport");

      await webAppTransport.start();

      // Build x402 proxy handler for SSE if available
      let x402HandlerSSE: X402ProxyHandler | undefined;
      if (x402ClientsSSE?.client && x402ClientsSSE?.http) {
        const { client: x402c, http: x402h } = x402ClientsSSE;
        x402HandlerSSE = {
          handlePayment: async (paymentInfo) => {
            const paymentRequired = x402h.getPaymentRequiredResponse(
              () => null,
              paymentInfo,
            );
            const paymentPayload =
              await x402c.createPaymentPayload(paymentRequired);
            const paymentHeaders =
              x402h.encodePaymentSignatureHeader(paymentPayload);
            const paymentValue =
              paymentHeaders["X-PAYMENT"] ??
              paymentHeaders["PAYMENT-SIGNATURE"] ??
              Object.values(paymentHeaders)[0];
            return paymentValue ?? null;
          },
        };
      }

      mcpProxy({
        transportToClient: webAppTransport,
        transportToServer: serverTransport,
        x402Handler: x402HandlerSSE,
      });
    } catch (error) {
      if (is401Error(error)) {
        console.error(
          "Received 401 Unauthorized from MCP server. Authentication failure.",
        );
        res.status(401).json(error);
        return;
      } else if (error instanceof SseError && error.code === 404) {
        console.error(
          "Received 404 not found from MCP server. Does the MCP server support SSE?",
        );
        res.status(404).json(error);
        return;
      } else if (JSON.stringify(error).includes("ECONNREFUSED")) {
        console.error("Connection refused. Is the MCP server running?");
        res.status(500).json(error);
      }
      console.error("Error in /sse route:", error);
      res.status(500).json(error);
    }
  },
);

app.post(
  "/message",
  originValidationMiddleware,
  authMiddleware,
  async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      console.log(`Received POST message for sessionId ${sessionId}`);

      const headerHolder = sessionHeaderHolders.get(sessionId);
      if (headerHolder) {
        updateHeadersInPlace(
          headerHolder.headers as Record<string, string>,
          getHttpHeaders(req),
        );
      }

      const transport = webAppTransports.get(sessionId) as SSEServerTransport;
      if (!transport) {
        res.status(404).end("Session not found");
        return;
      }
      await transport.handlePostMessage(req, res);
    } catch (error) {
      console.error("Error in /message route:", error);
      res.status(500).json(error);
    }
  },
);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

app.get("/config", originValidationMiddleware, authMiddleware, (req, res) => {
  try {
    res.json({
      defaultEnvironment,
      defaultCommand: values.command,
      defaultArgs: values.args,
      defaultTransport: values.transport,
      defaultServerUrl: values["server-url"],
    });
  } catch (error) {
    console.error("Error in /config route:", error);
    res.status(500).json(error);
  }
});

app.get(
  "/sandbox",
  sandboxRateLimiter as express.RequestHandler,
  (req, res) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const filePath = join(__dirname, "..", "static", "sandbox_proxy.html");
    let sandboxHtml;

    try {
      sandboxHtml = readFileSync(filePath, "utf-8");
    } catch (e) {
      sandboxHtml = "MCP Apps sandbox not loaded: " + e;
    }

    res.set("Cache-Control", "no-cache, no-store, max-age=0");
    res.send(sandboxHtml);
  },
);

const PORT = parseInt(
  process.env.SERVER_PORT || DEFAULT_MCP_PROXY_LISTEN_PORT,
  10,
);
const HOST = process.env.HOST || "localhost";

const server = app.listen(PORT, HOST);
server.on("listening", () => {
  console.log(`⚙️ Proxy server listening on ${HOST}:${PORT}`);
  if (!authDisabled) {
    console.log(
      `🔑 Session token: ${sessionToken}\n   ` +
        `Use this token to authenticate requests or set DANGEROUSLY_OMIT_AUTH=true to disable auth`,
    );
  } else {
    console.log(
      `⚠️  WARNING: Authentication is disabled. This is not recommended.`,
    );
  }
});
server.on("error", (err) => {
  if (err.message.includes(`EADDRINUSE`)) {
    console.error(`❌  Proxy Server PORT IS IN USE at port ${PORT} ❌ `);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});
