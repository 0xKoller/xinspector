import {
  LoggingLevel,
  LoggingLevelSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface LoggingControlProps {
  logLevel: LoggingLevel;
  sendLogLevelRequest: (level: LoggingLevel) => void;
  loggingSupported: boolean;
}

export function LoggingControl({
  logLevel,
  sendLogLevelRequest,
  loggingSupported,
}: LoggingControlProps) {
  if (!loggingSupported) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="logging-level-select">Logging Level</Label>
      <Select
        value={logLevel}
        onValueChange={(value: LoggingLevel) => sendLogLevelRequest(value)}
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
  );
}
