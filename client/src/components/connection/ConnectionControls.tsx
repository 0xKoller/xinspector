import { Play, RotateCcw, RefreshCwOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectionStatus } from "@/lib/constants";
import { InspectorConfig } from "@/lib/configurationTypes";

interface ConnectionControlsProps {
  connectionStatus: ConnectionStatus;
  transportType: "stdio" | "sse" | "streamable-http";
  onConnect: () => void;
  onDisconnect: () => void;
  config: InspectorConfig;
}

export function ConnectionControls({
  connectionStatus,
  transportType,
  onConnect,
  onDisconnect,
  config,
}: ConnectionControlsProps) {
  return (
    <div className="space-y-2">
      {connectionStatus === "connected" && (
        <div className="grid grid-cols-2 gap-4">
          <Button
            data-testid="connect-button"
            onClick={() => {
              onDisconnect();
              onConnect();
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {transportType === "stdio" ? "Restart" : "Reconnect"}
          </Button>
          <Button onClick={onDisconnect}>
            <RefreshCwOff className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
        </div>
      )}
      {connectionStatus !== "connected" && (
        <Button className="w-full" onClick={onConnect}>
          <Play className="w-4 h-4 mr-2" />
          Connect
        </Button>
      )}

      <div className="flex items-center justify-center space-x-2 mb-4">
        <div
          className={`w-2 h-2 rounded-full ${(() => {
            switch (connectionStatus) {
              case "connected":
                return "bg-status-success";
              case "error":
                return "bg-destructive";
              case "error-connecting-to-proxy":
                return "bg-destructive";
              default:
                return "bg-muted-foreground";
            }
          })()}`}
        />
        <span className="text-sm text-muted-foreground">
          {(() => {
            switch (connectionStatus) {
              case "connected":
                return "Connected";
              case "error": {
                const hasProxyToken = config.MCP_PROXY_AUTH_TOKEN?.value;
                if (!hasProxyToken) {
                  return "Connection Error - Did you add the proxy session token in Configuration?";
                }
                return "Connection Error - Check if your MCP server is running and proxy token is correct";
              }
              case "error-connecting-to-proxy":
                return "Error Connecting to MCP Inspector Proxy - Check Console logs";
              default:
                return "Disconnected";
            }
          })()}
        </span>
      </div>
    </div>
  );
}
