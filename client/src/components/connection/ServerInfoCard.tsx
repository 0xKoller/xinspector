import { Server } from "lucide-react";
import IconDisplay, { WithIcons } from "../IconDisplay";

interface ServerInfoCardProps {
  serverImplementation:
    | (WithIcons & { name?: string; version?: string; websiteUrl?: string })
    | null
    | undefined;
}

export function ServerInfoCard({ serverImplementation }: ServerInfoCardProps) {
  if (!serverImplementation) {
    return null;
  }

  return (
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
        {(serverImplementation as { websiteUrl?: string }).websiteUrl ? (
          <a
            href={(serverImplementation as { websiteUrl?: string }).websiteUrl}
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
  );
}
