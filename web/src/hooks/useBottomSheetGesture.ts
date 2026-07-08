import { useRef, useState } from 'react';

interface UseBottomSheetGestureProps {
  minHeight: number;
  midHeight: number;
  maxHeight: number;
  scrollSelector: string;
  onMinHeightReached?: () => void;
  onMidHeightReached?: () => void;
  onMaxHeightReached?: () => void;
}

export function useBottomSheetGesture({
  minHeight,
  midHeight,
  maxHeight,
  scrollSelector,
  onMinHeightReached,
  onMidHeightReached,
  onMaxHeightReached
}: UseBottomSheetGestureProps) {
  const [sheetHeight, setSheetHeight] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) return;

    const asideEl = e.currentTarget;
    if (asideEl) {
      startHeightRef.current = asideEl.getBoundingClientRect().height;
      asideEl.style.transition = 'none';
    } else {
      startHeightRef.current = midHeight;
    }

    startYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    if (typeof window !== 'undefined' && window.innerWidth > 768) return;

    const deltaY = e.touches[0].clientY - startYRef.current;
    const currentHeight = startHeightRef.current;

    // 1. 최대 높이가 아닐 때는 리스트 스크롤이 불가능하므로, 무조건 시트 크기만 제어합니다.
    if (currentHeight < maxHeight) {
      if (e.cancelable) e.preventDefault();
      const nextHeight = Math.min(maxHeight, Math.max(minHeight, currentHeight - deltaY));
      setSheetHeight(nextHeight);
      return;
    }

    // 2. 최대 높이(maxHeight)일 때의 제스처 처리
    if (currentHeight === maxHeight) {
      // 끌어내릴 때(deltaY > 0) + 스크롤 위치가 최상단(scrollTop <= 0)인 경우에만 시트 높이를 줄입니다.
      if (deltaY > 0) {
        const scrollContainer = e.currentTarget.matches(scrollSelector)
          ? e.currentTarget
          : e.currentTarget.querySelector(scrollSelector) as HTMLElement;

        const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

        if (scrollTop <= 0) {
          if (e.cancelable) e.preventDefault();
          const nextHeight = Math.max(minHeight, currentHeight - deltaY);
          setSheetHeight(nextHeight);
        }
      }
      // 끌어올릴 때(deltaY < 0)는 이미 최대 높이이므로 아무것도 하지 않고 스크롤이 작동하도록 둡니다.
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const asideEl = e.currentTarget;
    if (asideEl) {
      asideEl.style.transition = '';
    }

    if (sheetHeight === null) return;

    let targetHeight = midHeight;
    const minThreshold = minHeight + (midHeight - minHeight) * 0.4;
    const maxThreshold = midHeight + (maxHeight - midHeight) * 0.4;

    if (sheetHeight <= minThreshold) {
      targetHeight = minHeight;
      onMinHeightReached?.();
    } else if (sheetHeight > minThreshold && sheetHeight < maxThreshold) {
      targetHeight = midHeight;
      onMidHeightReached?.();
    } else {
      targetHeight = maxHeight;
      onMaxHeightReached?.();
    }

    setSheetHeight(targetHeight);
  };

  return {
    sheetHeight,
    setSheetHeight,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
}
