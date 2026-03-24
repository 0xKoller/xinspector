import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavGroupProps {
  label: string;
  children: React.ReactNode;
  isCollapsed: boolean;
  isAccordion?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function NavGroup({
  label,
  children,
  isCollapsed,
  isAccordion = false,
  isExpanded = true,
  onToggle,
}: NavGroupProps) {
  return (
    <div className="space-y-1">
      {!isCollapsed && (
        <div
          className={cn(
            "flex items-center px-3 py-1.5",
            isAccordion && "cursor-pointer hover:bg-accent/30 rounded-sm",
          )}
          onClick={isAccordion ? onToggle : undefined}
        >
          <span className="flex-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          {isAccordion &&
            (isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            ))}
        </div>
      )}
      {isCollapsed && <div className="mx-auto my-1 h-px w-6 bg-border" />}
      {(!isAccordion || isExpanded) && (
        <div
          className={cn("space-y-0.5", isAccordion && !isCollapsed && "pl-2")}
        >
          {children}
        </div>
      )}
    </div>
  );
}
