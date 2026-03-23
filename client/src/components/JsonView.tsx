import { useState, memo, useMemo, useCallback, useEffect } from "react";
import type React from "react";
import type { JsonValue } from "@/utils/jsonUtils";
import clsx from "clsx";
import { Copy, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/hooks/useToast";
import { getDataType, tryParseJson } from "@/utils/jsonUtils";
import useCopy from "@/lib/hooks/useCopy";

interface JsonViewProps {
  data: unknown;
  name?: string;
  initialExpandDepth?: number;
  className?: string;
  withCopyButton?: boolean;
  isError?: boolean;
}

const JsonView = memo(
  ({
    data,
    name,
    initialExpandDepth = 3,
    className,
    withCopyButton = true,
    isError = false,
  }: JsonViewProps) => {
    const { toast } = useToast();
    const { copied, setCopied } = useCopy();

    const normalizedData = useMemo(() => {
      return typeof data === "string"
        ? tryParseJson(data).success
          ? tryParseJson(data).data
          : data
        : data;
    }, [data]);

    const handleCopy = useCallback(() => {
      try {
        navigator.clipboard.writeText(
          typeof normalizedData === "string"
            ? normalizedData
            : JSON.stringify(normalizedData, null, 2),
        );
        setCopied(true);
      } catch (error) {
        toast({
          title: "Error",
          description: `There was an error coping result into the clipboard: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
        });
      }
    }, [toast, normalizedData, setCopied]);

    return (
      <div className={clsx("p-4 border rounded relative", className)}>
        {withCopyButton && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2"
            onClick={handleCopy}
          >
            {copied ? (
              <CheckCheck className="size-4 text-foreground" />
            ) : (
              <Copy className="size-4 text-foreground" />
            )}
          </Button>
        )}
        <div className="font-mono text-sm transition-all duration-300">
          <JsonNode
            data={normalizedData as JsonValue}
            name={name}
            depth={0}
            initialExpandDepth={initialExpandDepth}
            isError={isError}
          />
        </div>
      </div>
    );
  },
);

JsonView.displayName = "JsonView";

interface JsonNodeProps {
  data: JsonValue;
  name?: string;
  depth: number;
  initialExpandDepth: number;
  isError?: boolean;
}

const JsonNode = memo(
  ({
    data,
    name,
    depth = 0,
    initialExpandDepth,
    isError = false,
  }: JsonNodeProps) => {
    const { toast } = useToast();
    const [isExpanded, setIsExpanded] = useState(depth < initialExpandDepth);
    const [typeStyleMap] = useState<Record<string, string>>({
      number: "text-[#d2a6ff]",
      boolean: "text-[#d2a6ff]",
      null: "text-[#d2a6ff]",
      undefined: "text-muted-foreground",
      string: "text-[#aad94c]",
      error: "text-destructive",
      default: "text-[#bfbdb6]",
    });
    const dataType = getDataType(data);

    const [copied, setCopied] = useState(false);
    useEffect(() => {
      let timeoutId: NodeJS.Timeout;
      if (copied) {
        timeoutId = setTimeout(() => setCopied(false), 500);
      }
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }, [copied]);

    const handleCopyValue = useCallback(
      (value: JsonValue) => {
        try {
          let text: string;
          const valueType = getDataType(value);
          switch (valueType) {
            case "string":
              text = value as unknown as string;
              break;
            case "number":
            case "boolean":
              text = String(value);
              break;
            case "null":
              text = "null";
              break;
            case "undefined":
              text = "undefined";
              break;
            default:
              text = JSON.stringify(value);
          }
          navigator.clipboard.writeText(text);
          setCopied(true);
        } catch (error) {
          toast({
            title: "Error",
            description: `There was an error coping result into the clipboard: ${error instanceof Error ? error.message : String(error)}`,
            variant: "destructive",
          });
        }
      },
      [toast],
    );

    const renderCollapsible = (isArray: boolean) => {
      const items = isArray
        ? (data as JsonValue[])
        : Object.entries(data as Record<string, JsonValue>);
      const itemCount = items.length;
      const isEmpty = itemCount === 0;

      const symbolMap = {
        open: isArray ? "[" : "{",
        close: isArray ? "]" : "}",
        collapsed: isArray ? "[ ... ]" : "{ ... }",
        empty: isArray ? "[]" : "{}",
      };

      if (isEmpty) {
        return (
          <div className="flex items-center">
            {name && <span className="mr-1 text-[#ffb454]">{name}:</span>}
            <span className="text-[#bfbdb6]">{symbolMap.empty}</span>
          </div>
        );
      }

      return (
        <div className="flex flex-col">
          <div
            className="flex items-center mr-1 rounded cursor-pointer group hover:bg-white/5"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {name && (
              <span className="mr-1 text-[#ffb454] group-hover:text-[#ffb454]/80">
                {name}:
              </span>
            )}
            {isExpanded ? (
              <span className="text-[#ffb454] group-hover:text-[#ffb454]/80">
                {symbolMap.open}
              </span>
            ) : (
              <>
                <span className="text-[#ffb454] group-hover:text-[#ffb454]/80">
                  {symbolMap.collapsed}
                </span>
                <span className="ml-1 text-[#bfbdb6] group-hover:text-[#bfbdb6]/80">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
              </>
            )}
          </div>
          {isExpanded && (
            <>
              <div className="pl-2 ml-4 border-l border-border">
                {isArray
                  ? (items as JsonValue[]).map((item, index) => (
                      <div key={index} className="my-1">
                        <JsonNode
                          data={item}
                          name={`${index}`}
                          depth={depth + 1}
                          initialExpandDepth={initialExpandDepth}
                        />
                      </div>
                    ))
                  : (items as [string, JsonValue][]).map(([key, value]) => (
                      <div key={key} className="my-1">
                        <JsonNode
                          data={value}
                          name={key}
                          depth={depth + 1}
                          initialExpandDepth={initialExpandDepth}
                        />
                      </div>
                    ))}
              </div>
              <div className="text-[#ffb454]">{symbolMap.close}</div>
            </>
          )}
        </div>
      );
    };

    const renderString = (value: string) => {
      const maxLength = 100;
      const isTooLong = value.length > maxLength;

      if (!isTooLong) {
        return (
          <div className="flex mr-1 rounded hover:bg-white/5 group items-start">
            {name && <span className="mr-1 text-[#ffb454]">{name}:</span>}
            <pre
              className={clsx(
                isError ? typeStyleMap.error : typeStyleMap.string,
                "break-all whitespace-pre-wrap",
              )}
            >
              "{value}"
            </pre>
            <Button
              variant="ghost"
              className="ml-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                handleCopyValue(value as unknown as JsonValue);
              }}
              aria-label={name ? `Copy value of ${name}` : "Copy value"}
              title={name ? `Copy value of ${name}` : "Copy value"}
            >
              {copied ? (
                <CheckCheck className="size-4 text-foreground" />
              ) : (
                <Copy className="size-4 text-foreground" />
              )}
            </Button>
          </div>
        );
      }

      return (
        <div className="flex mr-1 rounded group hover:bg-white/5 items-start">
          {name && (
            <span className="mr-1 text-[#ffb454] group-hover:text-[#ffb454]/80">
              {name}:
            </span>
          )}
          <pre
            className={clsx(
              isError ? typeStyleMap.error : typeStyleMap.string,
              "cursor-pointer break-all whitespace-pre-wrap",
            )}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Click to collapse" : "Click to expand"}
          >
            {isExpanded ? `"${value}"` : `"${value.slice(0, maxLength)}..."`}
          </pre>
          <Button
            variant="ghost"
            className="ml-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              handleCopyValue(value as unknown as JsonValue);
            }}
            aria-label={name ? `Copy value of ${name}` : "Copy value"}
            title={name ? `Copy value of ${name}` : "Copy value"}
          >
            {copied ? (
              <CheckCheck className="size-4 text-foreground" />
            ) : (
              <Copy className="size-4 text-foreground" />
            )}
          </Button>
        </div>
      );
    };

    switch (dataType) {
      case "object":
      case "array":
        return renderCollapsible(dataType === "array");
      case "string":
        return renderString(data as string);
      default:
        return (
          <div className="flex items-center mr-1 rounded hover:bg-white/5 group">
            {name && <span className="mr-1 text-[#ffb454]">{name}:</span>}
            <span className={typeStyleMap[dataType] || typeStyleMap.default}>
              {data === null ? "null" : String(data)}
            </span>
            <Button
              variant="ghost"
              className="ml-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                handleCopyValue(data as JsonValue);
              }}
              aria-label={name ? `Copy value of ${name}` : "Copy value"}
              title={name ? `Copy value of ${name}` : "Copy value"}
            >
              {copied ? (
                <CheckCheck className="size-4 text-foreground" />
              ) : (
                <Copy className="size-4 text-foreground" />
              )}
            </Button>
          </div>
        );
    }
  },
);

JsonNode.displayName = "JsonNode";

export default JsonView;
