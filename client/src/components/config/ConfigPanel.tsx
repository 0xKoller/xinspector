import { useState } from "react";
import { ChevronDown, ChevronRight, Settings, HelpCircle } from "lucide-react";
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
import { InspectorConfig } from "@/lib/configurationTypes";

interface ConfigPanelProps {
  config: InspectorConfig;
  setConfig: (config: InspectorConfig) => void;
}

export function ConfigPanel({ config, setConfig }: ConfigPanelProps) {
  const [showConfig, setShowConfig] = useState(false);

  return (
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
                    <TooltipContent>{configItem.description}</TooltipContent>
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
  );
}
