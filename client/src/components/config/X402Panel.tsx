import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface X402PanelProps {
  x402Enabled: boolean;
  setX402Enabled: (enabled: boolean) => void;
  x402PrivateKey: string;
  setX402PrivateKey: (key: string) => void;
  transportType: "stdio" | "sse" | "streamable-http";
  connectionType: "direct" | "proxy";
}

export function X402Panel({
  x402Enabled,
  setX402Enabled,
  x402PrivateKey,
  setX402PrivateKey,
  transportType,
  connectionType,
}: X402PanelProps) {
  const [showX402, setShowX402] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  if (transportType === "stdio") {
    return null;
  }

  return (
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
                      onChange={(e) => setX402PrivateKey(e.target.value)}
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
                    Use testnet keys only. Key is stored locally and sent to the
                    local proxy only.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
