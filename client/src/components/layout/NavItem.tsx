import { type LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  value: string;
  isActive: boolean;
  isDisabled?: boolean;
  disabledReason?: string;
  badge?: number;
  isCollapsed: boolean;
  onClick: (value: string) => void;
}

export function NavItem({
  icon: Icon,
  label,
  value,
  isActive,
  isDisabled = false,
  disabledReason,
  badge,
  isCollapsed,
  onClick,
}: NavItemProps) {
  const button = (
    <button
      className={cn(
        "relative flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
        isActive && "bg-accent text-accent-foreground",
        !isActive &&
          !isDisabled &&
          "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        isDisabled && "opacity-50 cursor-not-allowed",
        isCollapsed && "justify-center px-0",
      )}
      onClick={() => !isDisabled && onClick(value)}
      disabled={isDisabled}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
      {badge != null && badge > 0 && (
        <span
          className={cn(
            "flex h-4 min-w-4 items-center justify-center rounded-full bg-status-warning px-1 text-[10px] font-medium text-black",
            isCollapsed ? "absolute -right-0.5 -top-0.5" : "ml-auto",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );

  if (isCollapsed || (isDisabled && disabledReason)) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {isDisabled && disabledReason ? disabledReason : label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
