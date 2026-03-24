import { cn } from "@/lib/utils";

interface AppShellProps {
  navRail: React.ReactNode;
  children: React.ReactNode;
  historyPanel: React.ReactNode;
}

export function AppShell({ navRail, children, historyPanel }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {/* Main area: NavRail + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* NavRail - fixed width, not percentage-based */}
        <div className="h-full flex-shrink-0 border-r border-border">
          {navRail}
        </div>
        {/* Content area */}
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-0">{children}</div>
        </div>
      </div>
      {/* History panel - bottom */}
      <div
        className={cn(
          "h-[200px] flex-shrink-0 overflow-auto border-t border-border",
        )}
      >
        {historyPanel}
      </div>
    </div>
  );
}
