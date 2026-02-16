export function SignCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden animate-pulse">
      <div className="w-12 h-12 mx-auto mt-3 bg-gray-200 rounded" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-2.5 bg-gray-100 rounded w-1/2 mt-1" />
      </div>
    </div>
  );
}

export function BlockCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-3 flex gap-4 animate-pulse max-md:flex-col">
      <div className="shrink-0 w-20 h-20 max-md:w-full max-md:h-32 bg-gray-200 rounded" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="h-4 bg-gray-200 rounded w-28" />
          <div className="h-4 bg-gray-100 rounded w-16" />
          <div className="h-4 bg-gray-100 rounded w-20" />
        </div>
        <div className="h-3.5 bg-gray-100 rounded w-full" />
        <div className="h-3.5 bg-gray-100 rounded w-3/4" />
      </div>
    </div>
  );
}

export function GraphemeCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-3 flex gap-4 animate-pulse max-md:flex-col">
      <div className="shrink-0 w-16 h-16 bg-gray-200 rounded" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-3.5 bg-gray-100 rounded w-16" />
        </div>
        <div className="h-3.5 bg-gray-100 rounded w-full" />
        <div className="h-3.5 bg-gray-100 rounded w-2/3" />
        <div className="flex gap-3 mt-1">
          <div className="h-3 bg-gray-100 rounded w-16" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
      </div>
    </div>
  );
}
