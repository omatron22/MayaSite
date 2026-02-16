import { useState, useEffect, useRef, useCallback } from 'react';

export function useLazyLoad<T>(
  allItems: T[],
  initialCount: number = 100,
  incrementCount: number = 50,
) {
  const [displayCount, setDisplayCount] = useState(initialCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const hasMoreRef = useRef(true);
  const isLoadingMoreRef = useRef(false);

  const visibleItems = allItems.slice(0, displayCount);
  const hasMore = displayCount < allItems.length;

  // Keep refs in sync
  hasMoreRef.current = hasMore;
  isLoadingMoreRef.current = isLoadingMore;

  const loadMore = useCallback(() => {
    if (isLoadingMoreRef.current || !hasMoreRef.current) return;

    setIsLoadingMore(true);
    setDisplayCount(prev => {
      const next = Math.min(prev + incrementCount, allItems.length);
      return next;
    });
    setIsLoadingMore(false);
  }, [allItems.length, incrementCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [loadMore]);

  // Reset when items change
  useEffect(() => {
    setDisplayCount(initialCount);
  }, [allItems.length, initialCount]);

  return {
    visibleItems,
    hasMore,
    loadMore,
    loaderRef,
    isLoadingMore,
    displayCount,
    totalCount: allItems.length,
  };
}
