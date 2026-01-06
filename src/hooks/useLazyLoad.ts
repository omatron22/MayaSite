// src/hooks/useLazyLoad.ts
import { useState, useEffect, useRef } from 'react';

export function useLazyLoad<T>(
  allItems: T[],
  initialCount: number = 100,
  incrementCount: number = 50
) {
  const [displayCount, setDisplayCount] = useState(initialCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const visibleItems = allItems.slice(0, displayCount);
  const hasMore = displayCount < allItems.length;

  const loadMore = () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + incrementCount, allItems.length));
      setIsLoadingMore(false);
    }, 100);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
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
  }, [hasMore, isLoadingMore]);

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
    totalCount: allItems.length
  };
}
