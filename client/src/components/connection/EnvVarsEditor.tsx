import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EnvVarsEditorProps {
  env: Record<string, string>;
  setEnv: (env: Record<string, string>) => void;
}

export function EnvVarsEditor({ env, setEnv }: EnvVarsEditorProps) {
  const [showEnvVars, setShowEnvVars] = useState(false);
  const [shownEnvVars, setShownEnvVars] = useState<Set<string>>(new Set());

  return (
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
                    shownEnvVars.has(key) ? "Hide value" : "Show value"
                  }
                  aria-pressed={shownEnvVars.has(key)}
                  title={shownEnvVars.has(key) ? "Hide value" : "Show value"}
                >
                  {shownEnvVars.has(key) ? (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
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
  );
}
