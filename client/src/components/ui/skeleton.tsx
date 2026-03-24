import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-muted", className)}
      {...props}
    />
  );
}

function ListPaneSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

function DetailPaneSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="space-y-3 pt-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="space-y-2 p-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/6" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

export { Skeleton, ListPaneSkeleton, DetailPaneSkeleton, ContentSkeleton };
