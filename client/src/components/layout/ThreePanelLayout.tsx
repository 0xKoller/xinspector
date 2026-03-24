import {
  Panel,
  Group,
  Separator,
  useDefaultLayout,
} from "react-resizable-panels";
import { cn } from "@/lib/utils";

interface ThreePanelLayoutProps {
  listPanel: React.ReactNode;
  detailPanel: React.ReactNode;
  resultPanel: React.ReactNode;
  showResultPanel: boolean;
  autoSaveId: string;
}

const handleClassName = cn(
  "w-px bg-border transition-colors hover:bg-muted-foreground/20",
  "data-[resize-handle-active]:bg-muted-foreground/30",
);

export function ThreePanelLayout({
  listPanel,
  detailPanel,
  resultPanel,
  showResultPanel,
  autoSaveId,
}: ThreePanelLayoutProps) {
  const layout = useDefaultLayout({ groupId: autoSaveId });

  return (
    <Group
      orientation="horizontal"
      defaultLayout={layout.defaultLayout}
      onLayoutChanged={layout.onLayoutChanged}
      style={{ height: "100%" }}
    >
      <Panel defaultSize={25} minSize={15} maxSize={40}>
        <div className="h-full overflow-auto border-r border-border">
          {listPanel}
        </div>
      </Panel>
      <Separator className={handleClassName} />
      <Panel defaultSize={showResultPanel ? 40 : 75} minSize={30}>
        <div className="h-full overflow-auto">{detailPanel}</div>
      </Panel>
      {showResultPanel && (
        <>
          <Separator className={handleClassName} />
          <Panel defaultSize={35} minSize={15} collapsible collapsedSize={0}>
            <div className="h-full overflow-auto border-l border-border">
              {resultPanel}
            </div>
          </Panel>
        </>
      )}
    </Group>
  );
}
