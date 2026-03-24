import { useState, useCallback } from "react";
import {
  Play,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Bug,
  Github,
  Eye,
  EyeOff,
  RotateCcw,
  Settings,
  HelpCircle,
  RefreshCwOff,
  Copy,
  CheckCheck,
  Server,
} from "lucide-react";
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
  LoggingLevel,
  LoggingLevelSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { InspectorConfig } from "@/lib/configurationTypes";
import { ConnectionStatus } from "@/lib/constants";
import { version } from "../../../package.json";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import CustomHeaders from "./CustomHeaders";
import { CustomHeaders as CustomHeadersType } from "@/lib/types/customHeaders";
import { useToast } from "../lib/hooks/useToast";
import IconDisplay, { WithIcons } from "./IconDisplay";

interface SidebarProps {
  connectionStatus: ConnectionStatus;
  transportType: "stdio" | "sse" | "streamable-http";
  setTransportType: (type: "stdio" | "sse" | "streamable-http") => void;
  command: string;
  setCommand: (command: string) => void;
  args: string;
  setArgs: (args: string) => void;
  sseUrl: string;
  setSseUrl: (url: string) => void;
  env: Record<string, string>;
  setEnv: (env: Record<string, string>) => void;
  // Custom headers support
  customHeaders: CustomHeadersType;
  setCustomHeaders: (headers: CustomHeadersType) => void;
  // x402 payment protocol support
  x402Enabled: boolean;
  setX402Enabled: (enabled: boolean) => void;
  x402PrivateKey: string;
  setX402PrivateKey: (key: string) => void;
  oauthClientId: string;
  setOauthClientId: (id: string) => void;
  oauthClientSecret: string;
  setOauthClientSecret: (secret: string) => void;
  oauthScope: string;
  setOauthScope: (scope: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  logLevel: LoggingLevel;
  sendLogLevelRequest: (level: LoggingLevel) => void;
  loggingSupported: boolean;
  config: InspectorConfig;
  setConfig: (config: InspectorConfig) => void;
  connectionType: "direct" | "proxy";
  setConnectionType: (type: "direct" | "proxy") => void;
  serverImplementation?:
    | (WithIcons & { name?: string; version?: string; websiteUrl?: string })
    | null;
}

const Sidebar = ({
  connectionStatus,
  transportType,
  setTransportType,
  command,
  setCommand,
  args,
  setArgs,
  sseUrl,
  setSseUrl,
  env,
  setEnv,
  customHeaders,
  setCustomHeaders,
  x402Enabled,
  setX402Enabled,
  x402PrivateKey,
  setX402PrivateKey,
  oauthClientId,
  setOauthClientId,
  oauthClientSecret,
  setOauthClientSecret,
  oauthScope,
  setOauthScope,
  onConnect,
  onDisconnect,
  logLevel,
  sendLogLevelRequest,
  loggingSupported,
  config,
  setConfig,
  connectionType,
  setConnectionType,
  serverImplementation,
}: SidebarProps) => {
  const [showEnvVars, setShowEnvVars] = useState(false);
  const [showAuthConfig, setShowAuthConfig] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [shownEnvVars, setShownEnvVars] = useState<Set<string>>(new Set());
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showX402, setShowX402] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedServerEntry, setCopiedServerEntry] = useState(false);
  const [copiedServerFile, setCopiedServerFile] = useState(false);
  const { toast } = useToast();

  const connectionTypeTip =
    "Connect to server directly (requires CORS config on server) or via MCP Inspector Proxy";
  // Reusable error reporter for copy actions
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

  // Shared utility function to generate server config
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

  // Memoized config entry generator
  const generateMCPServerEntry = useCallback(() => {
    return JSON.stringify(generateServerConfig(), null, 4);
  }, [generateServerConfig]);

  // Memoized config file generator
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

  // Memoized copy handlers
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
    <div className="bg-card border-r border-border flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center">
          <h1 className="ml-2 text-lg font-semibold">
            MCP Inspector v{version}
          </h1>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-auto">
        <div className="space-y-4">
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
                    <Label htmlFor="connection-type-select">
                      Connection Type
                    </Label>
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

          {transportType === "stdio" && (
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => setShowEnvVars(!showEnvVars)}
                className="flex items-center w-full"
                data-testid="env-vars-button"
                aria-expanded={showEnvVars}
              >
                {showEnvVars ? (
                  <ChevronDown className="w-4 h-4 mr-2" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                Environment Variables
              </Button>
              {showEnvVars && (
                <div className="space-y-2">
                  {Object.entries(env).map(([key, value], idx) => (
                    <div key={idx} className="space-y-2 pb-4">
                      <div className="flex gap-2">
                        <Input
                          aria-label={`Environment variable key ${idx + 1}`}
                          placeholder="Key"
                          value={key}
                          onChange={(e) => {
                            const newKey = e.target.value;
                            const newEnv = Object.entries(env).reduce(
                              (acc, [k, v]) => {
                                if (k === key) {
                                  acc[newKey] = value;
                                } else {
                                  acc[k] = v;
                                }
                                return acc;
                              },
                              {} as Record<string, string>,
                            );
                            setEnv(newEnv);
                            setShownEnvVars((prev) => {
                              const next = new Set(prev);
                              if (next.has(key)) {
                                next.delete(key);
                                next.add(newKey);
                              }
                              return next;
                            });
                          }}
                          className="font-mono"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-9 w-9 p-0 shrink-0"
                          onClick={() => {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const { [key]: _removed, ...rest } = env;
                            setEnv(rest);
                          }}
                        >
                          ×
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          aria-label={`Environment variable value ${idx + 1}`}
                          type={shownEnvVars.has(key) ? "text" : "password"}
                          placeholder="Value"
                          value={value}
                          onChange={(e) => {
                            const newEnv = { ...env };
                            newEnv[key] = e.target.value;
                            setEnv(newEnv);
                          }}
                          className="font-mono"
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 p-0 shrink-0"
                              onClick={() => {
                                setShownEnvVars((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(key)) {
                                    next.delete(key);
                                  } else {
                                    next.add(key);
                                  }
                                  return next;
                                });
                              }}
                              aria-label={
                                shownEnvVars.has(key)
                                  ? "Hide value"
                                  : "Show value"
                              }
                              aria-pressed={shownEnvVars.has(key)}
                            >
                              {shownEnvVars.has(key) ? (
                                <Eye className="h-4 w-4" aria-hidden="true" />
                              ) : (
                                <EyeOff
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {shownEnvVars.has(key)
                              ? "Hide value"
                              : "Show value"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => {
                      const key = "";
                      const newEnv = { ...env };
                      newEnv[key] = "";
                      setEnv(newEnv);
                    }}
                  >
                    Add Environment Variable
                  </Button>
                </div>
              )}
            </div>
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

          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={() => setShowAuthConfig(!showAuthConfig)}
              className="flex items-center w-full"
              data-testid="auth-button"
              aria-expanded={showAuthConfig}
            >
              {showAuthConfig ? (
                <ChevronDown className="w-4 h-4 mr-2" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2" />
              )}
              Authentication
            </Button>
            {showAuthConfig && (
              <>
                {/* Custom Headers Section */}
                <div className="p-3 rounded border overflow-hidden">
                  <CustomHeaders
                    headers={customHeaders}
                    onChange={setCustomHeaders}
                  />
                </div>
                {transportType !== "stdio" && (
                  // OAuth Configuration
                  <div className="space-y-2 p-3  rounded border">
                    <h4 className="text-sm font-semibold flex items-center">
                      OAuth 2.0 Flow
                    </h4>
                    <div className="space-y-2">
                      <Label>Client ID</Label>
                      <Input
                        placeholder="Client ID"
                        onChange={(e) => setOauthClientId(e.target.value)}
                        value={oauthClientId}
                        data-testid="oauth-client-id-input"
                        className="font-mono"
                      />
                      <Label>Client Secret</Label>
                      <div className="flex gap-2">
                        <Input
                          type={showClientSecret ? "text" : "password"}
                          placeholder="Client Secret (optional)"
                          onChange={(e) => setOauthClientSecret(e.target.value)}
                          value={oauthClientSecret}
                          data-testid="oauth-client-secret-input"
                          className="font-mono"
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 p-0 shrink-0"
                              onClick={() =>
                                setShowClientSecret(!showClientSecret)
                              }
                              aria-label={
                                showClientSecret ? "Hide secret" : "Show secret"
                              }
                              aria-pressed={showClientSecret}
                            >
                              {showClientSecret ? (
                                <Eye className="h-4 w-4" aria-hidden="true" />
                              ) : (
                                <EyeOff
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {showClientSecret ? "Hide secret" : "Show secret"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Label>Redirect URL</Label>
                      <Input
                        readOnly
                        placeholder="Redirect URL"
                        value={window.location.origin + "/oauth/callback"}
                        className="font-mono"
                      />
                      <Label>Scope</Label>
                      <Input
                        placeholder="Scope (space-separated)"
                        onChange={(e) => setOauthScope(e.target.value)}
                        value={oauthScope}
                        data-testid="oauth-scope-input"
                        className="font-mono"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {/* x402 Payment Protocol */}
          {transportType !== "stdio" && (
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => setShowX402(!showX402)}
                className="flex items-center w-full"
                data-testid="x402-button"
                aria-expanded={showX402}
              >
                {showX402 ? (
                  <ChevronDown className="w-4 h-4 mr-2" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                x402 Payment Protocol
              </Button>
              {showX402 && (
                <div className="space-y-3 p-3 rounded border">
                  {connectionType === "direct" ? (
                    <p className="text-xs text-muted-foreground">
                      x402 requires proxy connection mode.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <Label>Enable x402</Label>
                        <Switch
                          checked={x402Enabled}
                          onCheckedChange={setX402Enabled}
                          data-testid="x402-toggle"
                        />
                      </div>
                      {x402Enabled && (
                        <div className="space-y-2">
                          <Label>EVM Private Key</Label>
                          <div className="flex gap-2">
                            <Input
                              type={showPrivateKey ? "text" : "password"}
                              placeholder="0x..."
                              value={x402PrivateKey}
                              onChange={(e) =>
                                setX402PrivateKey(e.target.value)
                              }
                              className="font-mono"
                              data-testid="x402-private-key"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 p-0 shrink-0"
                              onClick={() => setShowPrivateKey(!showPrivateKey)}
                            >
                              {showPrivateKey ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Use testnet keys only. Key is stored locally and
                            sent to the local proxy only.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Configuration */}
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center w-full"
              data-testid="config-button"
              aria-expanded={showConfig}
            >
              {showConfig ? (
                <ChevronDown className="w-4 h-4 mr-2" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2" />
              )}
              <Settings className="w-4 h-4 mr-2" />
              Configuration
            </Button>
            {showConfig && (
              <div className="space-y-2">
                {Object.entries(config).map(([key, configItem]) => {
                  const configKey = key as keyof InspectorConfig;
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Label
                          className="text-foreground break-all"
                          htmlFor={`${configKey}-input`}
                        >
                          {configItem.label}
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            {configItem.description}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {typeof configItem.value === "number" ? (
                        <Input
                          id={`${configKey}-input`}
                          type="number"
                          data-testid={`${configKey}-input`}
                          value={configItem.value}
                          onChange={(e) => {
                            const newConfig = { ...config };
                            newConfig[configKey] = {
                              ...configItem,
                              value: Number(e.target.value),
                            };
                            setConfig(newConfig);
                          }}
                          className="font-mono"
                        />
                      ) : typeof configItem.value === "boolean" ? (
                        <Select
                          data-testid={`${configKey}-select`}
                          value={configItem.value.toString()}
                          onValueChange={(val) => {
                            const newConfig = { ...config };
                            newConfig[configKey] = {
                              ...configItem,
                              value: val === "true",
                            };
                            setConfig(newConfig);
                          }}
                        >
                          <SelectTrigger id={`${configKey}-input`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">True</SelectItem>
                            <SelectItem value="false">False</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`${configKey}-input`}
                          data-testid={`${configKey}-input`}
                          value={configItem.value}
                          onChange={(e) => {
                            const newConfig = { ...config };
                            newConfig[configKey] = {
                              ...configItem,
                              value: e.target.value,
                            };
                            setConfig(newConfig);
                          }}
                          className="font-mono"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
                      return "bg-green-500";
                    case "error":
                      return "bg-red-500";
                    case "error-connecting-to-proxy":
                      return "bg-red-500";
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

            {connectionStatus === "connected" && serverImplementation && (
              <div className="bg-secondary p-3 rounded-lg mb-4">
                <div className="flex items-center gap-2 mb-1">
                  {(serverImplementation as WithIcons).icons &&
                  (serverImplementation as WithIcons).icons!.length > 0 ? (
                    <IconDisplay
                      icons={(serverImplementation as WithIcons).icons}
                      size="sm"
                    />
                  ) : (
                    <Server className="w-4 h-4 text-muted-foreground" />
                  )}
                  {(serverImplementation as { websiteUrl?: string })
                    .websiteUrl ? (
                    <a
                      href={
                        (serverImplementation as { websiteUrl?: string })
                          .websiteUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-foreground hover:text-white hover:underline transition-colors"
                    >
                      {serverImplementation.name || "MCP Server"}
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-foreground">
                      {serverImplementation.name || "MCP Server"}
                    </span>
                  )}
                </div>
                {serverImplementation.version && (
                  <div className="text-xs text-muted-foreground">
                    Version: {serverImplementation.version}
                  </div>
                )}
              </div>
            )}

            {loggingSupported && connectionStatus === "connected" && (
              <div className="space-y-2">
                <Label htmlFor="logging-level-select">Logging Level</Label>
                <Select
                  value={logLevel}
                  onValueChange={(value: LoggingLevel) =>
                    sendLogLevelRequest(value)
                  }
                >
                  <SelectTrigger id="logging-level-select">
                    <SelectValue placeholder="Select logging level" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(LoggingLevelSchema.enum).map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 border-t">
        <div className="flex items-center justify-end">
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" asChild>
                  <a
                    href="https://modelcontextprotocol.io/docs/tools/inspector"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <CircleHelp className="w-4 h-4 text-foreground" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Inspector Documentation</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" asChild>
                  <a
                    href="https://modelcontextprotocol.io/docs/tools/debugging"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Bug className="w-4 h-4 text-foreground" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Debugging Guide</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" asChild>
                  <a
                    href="https://github.com/modelcontextprotocol/inspector"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="w-4 h-4 text-foreground" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Report bugs or contribute on GitHub
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
