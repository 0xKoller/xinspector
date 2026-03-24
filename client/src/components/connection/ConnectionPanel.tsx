import { useState, useCallback } from "react";
import { Copy, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/hooks/useToast";

interface ConnectionPanelProps {
  transportType: "stdio" | "sse" | "streamable-http";
  setTransportType: (type: "stdio" | "sse" | "streamable-http") => void;
  command: string;
  setCommand: (command: string) => void;
  args: string;
  setArgs: (args: string) => void;
  sseUrl: string;
  setSseUrl: (url: string) => void;
  connectionType: "direct" | "proxy";
  setConnectionType: (type: "direct" | "proxy") => void;
  env: Record<string, string>;
}

const connectionTypeTip =
  "Connect to server directly (requires CORS config on server) or via MCP Inspector Proxy";

export function ConnectionPanel({
  transportType,
  setTransportType,
  command,
  setCommand,
  args,
  setArgs,
  sseUrl,
  setSseUrl,
  connectionType,
  setConnectionType,
  env,
}: ConnectionPanelProps) {
  const [copiedServerEntry, setCopiedServerEntry] = useState(false);
  const [copiedServerFile, setCopiedServerFile] = useState(false);
  const { toast } = useToast();

  const reportError = useCallback(
    (error: unknown) => {
      toast({
        title: "Error",
        description: `Failed to copy config: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    },
    [toast],
  );

  const generateServerConfig = useCallback(() => {
    if (transportType === "stdio") {
      return {
        command,
        args: args.trim() ? args.split(/\s+/) : [],
        env: { ...env },
      };
    }
    if (transportType === "sse") {
      return {
        type: "sse",
        url: sseUrl,
        note: "For SSE connections, add this URL directly in your MCP Client",
      };
    }
    if (transportType === "streamable-http") {
      return {
        type: "streamable-http",
        url: sseUrl,
        note: "For Streamable HTTP connections, add this URL directly in your MCP Client",
      };
    }
    return {};
  }, [transportType, command, args, env, sseUrl]);

  const generateMCPServerEntry = useCallback(() => {
    return JSON.stringify(generateServerConfig(), null, 4);
  }, [generateServerConfig]);

  const generateMCPServerFile = useCallback(() => {
    return JSON.stringify(
      {
        mcpServers: {
          "default-server": generateServerConfig(),
        },
      },
      null,
      4,
    );
  }, [generateServerConfig]);

  const handleCopyServerEntry = useCallback(() => {
    try {
      const configJson = generateMCPServerEntry();
      navigator.clipboard
        .writeText(configJson)
        .then(() => {
          setCopiedServerEntry(true);

          toast({
            title: "Config entry copied",
            description:
              transportType === "stdio"
                ? "Server configuration has been copied to clipboard. Add this to your mcp.json inside the 'mcpServers' object with your preferred server name."
                : transportType === "streamable-http"
                  ? "Streamable HTTP URL has been copied. Use this URL directly in your MCP Client."
                  : "SSE URL has been copied. Use this URL directly in your MCP Client.",
          });

          setTimeout(() => {
            setCopiedServerEntry(false);
          }, 2000);
        })
        .catch((error) => {
          reportError(error);
        });
    } catch (error) {
      reportError(error);
    }
  }, [generateMCPServerEntry, transportType, toast, reportError]);

  const handleCopyServerFile = useCallback(() => {
    try {
      const configJson = generateMCPServerFile();
      navigator.clipboard
        .writeText(configJson)
        .then(() => {
          setCopiedServerFile(true);

          toast({
            title: "Servers file copied",
            description:
              "Servers configuration has been copied to clipboard. Add this to your mcp.json file. Current testing server will be added as 'default-server'",
          });

          setTimeout(() => {
            setCopiedServerFile(false);
          }, 2000);
        })
        .catch((error) => {
          reportError(error);
        });
    } catch (error) {
      reportError(error);
    }
  }, [generateMCPServerFile, toast, reportError]);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="transport-type-select">Transport Type</Label>
        <Select
          value={transportType}
          onValueChange={(value: "stdio" | "sse" | "streamable-http") =>
            setTransportType(value)
          }
        >
          <SelectTrigger id="transport-type-select">
            <SelectValue placeholder="Select transport type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stdio">STDIO</SelectItem>
            <SelectItem value="sse">SSE</SelectItem>
            <SelectItem value="streamable-http">Streamable HTTP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {transportType === "stdio" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="command-input">Command</Label>
            <Input
              id="command-input"
              placeholder="Command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onBlur={(e) => setCommand(e.target.value.trim())}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="arguments-input">Arguments</Label>
            <Input
              id="arguments-input"
              placeholder="Arguments (space-separated)"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              className="font-mono"
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="sse-url-input">URL</Label>
            {sseUrl ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    id="sse-url-input"
                    placeholder="URL"
                    value={sseUrl}
                    onChange={(e) => setSseUrl(e.target.value)}
                    className="font-mono"
                  />
                </TooltipTrigger>
                <TooltipContent>{sseUrl}</TooltipContent>
              </Tooltip>
            ) : (
              <Input
                id="sse-url-input"
                placeholder="URL"
                value={sseUrl}
                onChange={(e) => setSseUrl(e.target.value)}
                className="font-mono"
              />
            )}
          </div>

          {/* Connection Type switch - only visible for non-STDIO transport types */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-2">
                <Label htmlFor="connection-type-select">Connection Type</Label>
                <Select
                  value={connectionType}
                  onValueChange={(value: "direct" | "proxy") =>
                    setConnectionType(value)
                  }
                >
                  <SelectTrigger id="connection-type-select">
                    <SelectValue placeholder="Select connection type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proxy">Via Proxy</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent>{connectionTypeTip}</TooltipContent>
          </Tooltip>
        </>
      )}

      {/* Always show both copy buttons for all transport types */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyServerEntry}
              className="w-full"
            >
              {copiedServerEntry ? (
                <CheckCheck className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Server Entry
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy Server Entry</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyServerFile}
              className="w-full"
            >
              {copiedServerFile ? (
                <CheckCheck className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Servers File
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy Servers File</TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}
