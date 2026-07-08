import { useRef, useState } from 'react';

interface UseBottomSheetGestureProps {
  minHeight?: number;
  midHeight?: number;
  maxHeight?: number;
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
  const getDvhInPixels = (percent: number) => {
    if (typeof window === 'undefined') return 0;
    return (window.innerHeight * percent) / 100;
  };

  const finalMinHeight = minHeight ?? 60;
  const finalMidHeight = midHeight ?? getDvhInPixels(45);
  const finalMaxHeight = maxHeight ?? getDvhInPixels(85);

  const [sheetHeight, setSheetHeight] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) return;

    // 터치가 발생한 구체적인 자식 요소에 구애받지 않고, 항상 최상위 시트 컨테이너(aside 또는 패널)의 높이를 구합니다.
    const asideEl = e.currentTarget.closest('aside, [class*="app-detail-panel"]') as HTMLElement || e.currentTarget;
    if (asideEl) {
      startHeightRef.current = asideEl.getBoundingClientRect().height;
      asideEl.style.transition = 'none';
    } else {
      startHeightRef.current = finalMidHeight;
    }

    startYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    if (typeof window !== 'undefined' && window.innerWidth > 768) return;

    const deltaY = e.touches[0].clientY - startYRef.current;
    const currentHeight = startHeightRef.current;

    // 1. [예외] 이미 최대 높이 상태에서 위로 쓸어올릴 때(deltaY < 0)는 
    // 시트를 더 키울 수 없으므로, 기본 스크롤바(아래로 내림)가 작동하도록 즉시 리턴합니다.
    if (currentHeight === finalMaxHeight && deltaY < 0) {
      return;
    }

    // 스크롤 컨테이너 탐색
    const scrollContainer = e.currentTarget.className.includes('sidebar-list') 
      ? e.currentTarget 
      : e.currentTarget.querySelector(scrollSelector) as HTMLElement;

    const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

    // 2. [예외] 스크롤바가 내려가 있는 상태(scrollTop > 0)라면
    // 스크롤바가 위로 올라가야 하므로, 즉시 리턴하여 기본 스크롤에 양보합니다.
    if (scrollTop > 0) {
      return;
    }

    // 3. 그 외 모든 상황(시트 높이가 중간/최소이거나, 최대 높이이면서 스크롤이 최상단일 때 내릴 때 등)
    // 브라우저 기본 스크롤을 차단하고 시트 크기만 제어합니다.
    if (e.cancelable) e.preventDefault();
    const nextHeight = Math.min(finalMaxHeight, Math.max(finalMinHeight, currentHeight - deltaY));
    setSheetHeight(nextHeight);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const asideEl = e.currentTarget;
    if (asideEl) {
      asideEl.style.transition = '';
    }

    if (sheetHeight === null) return;

    let targetHeight = finalMidHeight;
    const minThreshold = finalMinHeight + (finalMidHeight - finalMinHeight) * 0.4;
    const maxThreshold = finalMidHeight + (finalMaxHeight - finalMidHeight) * 0.4;

    if (sheetHeight <= minThreshold) {
      targetHeight = finalMinHeight;
      onMinHeightReached?.();
    } else if (sheetHeight > minThreshold && sheetHeight < maxThreshold) {
      targetHeight = finalMidHeight;
      onMidHeightReached?.();
    } else {
      targetHeight = finalMaxHeight;
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
    },
    minHeight: finalMinHeight,
    midHeight: finalMidHeight,
    maxHeight: finalMaxHeight
  };
}
