import { useState } from "react";
import {
  Files,
  MessageSquare,
  Hammer,
  ListTodo,
  AppWindow,
  Bell,
  Hash,
  FolderTree,
  Key,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Github,
  CircleHelp,
  Bug,
  CreditCard,
  Variable,
  FileKey,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NavItem } from "./NavItem";
import { NavGroup } from "./NavGroup";
import { ConnectionPanel } from "@/components/connection/ConnectionPanel";
import { ConnectionControls } from "@/components/connection/ConnectionControls";
import { ServerInfoCard } from "@/components/connection/ServerInfoCard";
import { LoggingControl } from "@/components/config/LoggingControl";
import type { ConnectionStatus } from "@/lib/constants";
import type { InspectorConfig } from "@/lib/configurationTypes";
import type { LoggingLevel } from "@modelcontextprotocol/sdk/types.js";
import type { WithIcons } from "@/components/IconDisplay";
import { cn } from "@/lib/utils";
import { version } from "../../../../package.json";

interface NavRailProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  connectionStatus: ConnectionStatus;
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
  onConnect: () => void;
  onDisconnect: () => void;
  config: InspectorConfig;
  logLevel: LoggingLevel;
  sendLogLevelRequest: (level: LoggingLevel) => void;
  loggingSupported: boolean;
  serverCapabilities?: {
    resources?: object;
    prompts?: object;
    tools?: object;
    tasks?: object;
  } | null;
  serverImplementation?:
    | (WithIcons & { name?: string; version?: string; websiteUrl?: string })
    | null;
  pendingSampleCount: number;
  pendingElicitationCount: number;
}

export function NavRail({
  activeTab,
  setActiveTab,
  connectionStatus,
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
  onConnect,
  onDisconnect,
  config,
  logLevel,
  sendLogLevelRequest,
  loggingSupported,
  serverCapabilities,
  serverImplementation,
  pendingSampleCount,
  pendingElicitationCount,
}: NavRailProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("xinspector-navrail-collapsed") === "true";
  });
  const [expandedGroup, setExpandedGroup] = useState<string | null>(
    "configuration",
  );

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("xinspector-navrail-collapsed", String(next));
  };

  const handleNav = (value: string) => {
    setActiveTab(value);
    window.location.hash = value;
  };

  const isConnected = connectionStatus === "connected";

  return (
    <div
      style={{ width: isCollapsed ? 56 : 240 }}
      className={cn(
        "flex h-full flex-col bg-card/50 transition-all duration-150 ease-in-out overflow-hidden",
      )}
    >
      {/* Header: collapse toggle + title */}
      <div className="flex items-center justify-between p-2 border-b border-border">
        {!isCollapsed && (
          <span className="text-xs font-medium text-muted-foreground truncate px-1">
            Inspector v{version}
          </span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={toggleCollapsed}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">
        {/* Connection section */}
        {isCollapsed ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="relative flex w-full h-auto items-center justify-center p-2 hover:bg-accent/50"
              >
                <Server className="h-4 w-4" />
                <span
                  className={cn(
                    "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full",
                    isConnected ? "bg-status-success" : "bg-muted-foreground",
                  )}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-80 p-4">
              <div className="space-y-4">
                <ConnectionPanel
                  transportType={transportType}
                  setTransportType={setTransportType}
                  command={command}
                  setCommand={setCommand}
                  args={args}
                  setArgs={setArgs}
                  sseUrl={sseUrl}
                  setSseUrl={setSseUrl}
                  connectionType={connectionType}
                  setConnectionType={setConnectionType}
                  env={env}
                />
                <ConnectionControls
                  connectionStatus={connectionStatus}
                  transportType={transportType}
                  onConnect={onConnect}
                  onDisconnect={onDisconnect}
                  config={config}
                />
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <div className="space-y-3">
            <ConnectionPanel
              transportType={transportType}
              setTransportType={setTransportType}
              command={command}
              setCommand={setCommand}
              args={args}
              setArgs={setArgs}
              sseUrl={sseUrl}
              setSseUrl={setSseUrl}
              connectionType={connectionType}
              setConnectionType={setConnectionType}
              env={env}
            />
            <ConnectionControls
              connectionStatus={connectionStatus}
              transportType={transportType}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
              config={config}
            />
            <ServerInfoCard serverImplementation={serverImplementation} />
          </div>
        )}

        {/* Primitives */}
        <NavGroup label="Primitives" isCollapsed={isCollapsed}>
          <NavItem
            icon={Files}
            label="Resources"
            value="resources"
            isActive={activeTab === "resources"}
            isDisabled={!serverCapabilities?.resources}
            disabledReason="Resources not supported by this server"
            isCollapsed={isCollapsed}
            onClick={handleNav}
          />
          <NavItem
            icon={MessageSquare}
            label="Prompts"
            value="prompts"
            isActive={activeTab === "prompts"}
            isDisabled={!serverCapabilities?.prompts}
            disabledReason="Prompts not supported by this server"
            isCollapsed={isCollapsed}
            onClick={handleNav}
          />
          <NavItem
            icon={Hammer}
            label="Tools"
            value="tools"
            isActive={activeTab === "tools"}
            isDisabled={!serverCapabilities?.tools}
            disabledReason="Tools not supported by this server"
            isCollapsed={isCollapsed}
            onClick={handleNav}
          />
          <NavItem
            icon={ListTodo}
            label="Tasks"
            value="tasks"
            isActive={activeTab === "tasks"}
            isDisabled={!serverCapabilities?.tasks}
            disabledReason="Tasks not supported by this server"
            isCollapsed={isCollapsed}
            onClick={handleNav}
          />
        </NavGroup>

        {/* Apps & Testing */}
        <NavGroup label="Apps & Testing" isCollapsed={isCollapsed}>
          <NavItem
            icon={AppWindow}
            label="Apps"
            value="apps"
            isActive={activeTab === "apps"}
            isCollapsed={isCollapsed}
            onClick={handleNav}
          />
          <NavItem
            icon={Bell}
            label="Ping"
            value="ping"
            isActive={activeTab === "ping"}
            isCollapsed={isCollapsed}
            onClick={handleNav}
          />
          <NavItem
            icon={Hash}
            label="Sampling"
            value="sampling"
            isActive={activeTab === "sampling"}
            badge={pendingSampleCount}
            isCollapsed={isCollapsed}
            onClick={handleNav}
          />
          <NavItem
            icon={MessageSquare}
            label="Elicitations"
            value="elicitations"
            isActive={activeTab === "elicitations"}
            badge={pendingElicitationCount}
            isCollapsed={isCollapsed}
            onClick={handleNav}
          />
        </NavGroup>

        {/* Configuration (accordion) */}
        <NavGroup
          label="Configuration"
          isCollapsed={isCollapsed}
          isAccordion
          isExpanded={expandedGroup === "configuration"}
          onToggle={() =>
            setExpandedGroup(
              expandedGroup === "configuration" ? null : "configuration",
            )
          }
        >
          <NavItem
            icon={FolderTree}
            label="Roots"
            value="roots"
            isActive={activeTab === "roots"}
            isCollapsed={isCollapsed}
            onClick={handleNav}
          />
          <NavItem
            icon={Key}
            label="Auth"
            value="auth"
            isActive={activeTab === "auth"}
            isCollapsed={isCollapsed}
            onClick={handleNav}
          />
          <NavItem
            icon={Settings}
            label="Metadata"
            value="metadata"
            isActive={activeTab === "metadata"}
            isCollapsed={isCollapsed}
            onClick={handleNav}
          />
          <NavItem
            icon={FileKey}
            label="Headers"
            value="headers"
            isActive={activeTab === "headers"}
            isCollapsed={isCollapsed}
            onClick={handleNav}
          />
          <NavItem
            icon={Variable}
            label="Env Vars"
            value="env"
            isActive={activeTab === "env"}
            isCollapsed={isCollapsed}
            onClick={handleNav}
          />
          <NavItem
            icon={CreditCard}
            label="x402"
            value="x402"
            isActive={activeTab === "x402"}
            isCollapsed={isCollapsed}
            onClick={handleNav}
          />
          <NavItem
            icon={Settings}
            label="Settings"
            value="config"
            isActive={activeTab === "config"}
            isCollapsed={isCollapsed}
            onClick={handleNav}
          />
        </NavGroup>
      </div>

      {/* Footer: utilities */}
      <div className="border-t border-border p-2 space-y-1">
        {isConnected && loggingSupported && !isCollapsed && (
          <LoggingControl
            logLevel={logLevel}
            sendLogLevelRequest={sendLogLevelRequest}
            loggingSupported={loggingSupported}
          />
        )}
        <div
          className={cn(
            "flex items-center",
            isCollapsed ? "justify-center" : "justify-end gap-1",
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <a
                  href="https://modelcontextprotocol.io/docs/tools/inspector"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Inspector Documentation</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <a
                  href="https://modelcontextprotocol.io/docs/tools/debugging"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Bug className="h-3.5 w-3.5" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Debugging Guide</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <a
                  href="https://github.com/modelcontextprotocol/inspector"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-3.5 w-3.5" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>GitHub</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
