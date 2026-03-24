import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CustomHeaders from "../CustomHeaders";
import { CustomHeaders as CustomHeadersType } from "@/lib/types/customHeaders";

interface AuthConfigPanelProps {
  customHeaders: CustomHeadersType;
  setCustomHeaders: (headers: CustomHeadersType) => void;
  oauthClientId: string;
  setOauthClientId: (id: string) => void;
  oauthClientSecret: string;
  setOauthClientSecret: (secret: string) => void;
  oauthScope: string;
  setOauthScope: (scope: string) => void;
  transportType: "stdio" | "sse" | "streamable-http";
}

export function AuthConfigPanel({
  customHeaders,
  setCustomHeaders,
  oauthClientId,
  setOauthClientId,
  oauthClientSecret,
  setOauthClientSecret,
  oauthScope,
  setOauthScope,
  transportType,
}: AuthConfigPanelProps) {
  const [showAuthConfig, setShowAuthConfig] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);

  return (
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
                        onClick={() => setShowClientSecret(!showClientSecret)}
                        aria-label={
                          showClientSecret ? "Hide secret" : "Show secret"
                        }
                        aria-pressed={showClientSecret}
                      >
                        {showClientSecret ? (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
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
  );
}
