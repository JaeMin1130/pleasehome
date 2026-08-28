import { useRef, useState, useEffect, useCallback } from 'react';

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
  const getDvh = useCallback((percent: number) => {
    if (typeof window === 'undefined') return 0;
    return (window.innerHeight * percent) / 100;
  }, []);

  const finalMinHeight = minHeight ?? getDvh(25);
  const finalMidHeight = midHeight ?? getDvh(50);
  const finalMaxHeight = maxHeight ?? getDvh(85);

  const [sheetHeight, setSheetHeight] = useState<number | null>(null);
  const [sheetState, setSheetState] = useState<0 | 1 | 2>(1); // 0: MIN, 1: MID, 2: MAX
  const startYRef = useRef(0);
  const startStateRef = useRef<0 | 1 | 2>(1);

  // 외부(isCollapsed 등)에서 sheetHeight가 변경될 때 sheetState 동기화
  useEffect(() => {
    if (sheetHeight === null) return;
    if (Math.abs(sheetHeight - finalMinHeight) < 5) {
      setSheetState(0);
    } else if (Math.abs(sheetHeight - finalMidHeight) < 5) {
      setSheetState(1);
    } else if (Math.abs(sheetHeight - finalMaxHeight) < 5) {
      setSheetState(2);
    }
  }, [sheetHeight, finalMinHeight, finalMidHeight, finalMaxHeight]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) return;

    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON' ||
      target.closest('button, [class*="more-profile-body"]')
    ) {
      return;
    }

    startYRef.current = e.touches[0].clientY;
    startStateRef.current = sheetState;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) return;

    const endY = e.changedTouches?.[0]?.clientY ?? startYRef.current;
    const deltaY = endY - startYRef.current;

    // 스크롤 컨테이너 탐색
    const scrollContainer = e.currentTarget.className.includes('sidebar-list') 
      ? e.currentTarget 
      : e.currentTarget.querySelector(scrollSelector) as HTMLElement;

    const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
    const swipeThreshold = 35;

    let targetState = startStateRef.current;

    if (deltaY < -swipeThreshold) {
      // 위로 스와이프 (+1 단계)
      targetState = Math.min(2, startStateRef.current + 1) as 0 | 1 | 2;
    } else if (deltaY > swipeThreshold) {
      // 아래로 스와이프 (-1 단계)
      // 최대 높이 상태이고 내부 스크롤이 내려가 있는 상태라면 시트 크기 변경 없이 일반 스크롤 유지
      if (startStateRef.current === 2 && scrollTop > 5) {
        return;
      }

      if (startStateRef.current === 0) {
        onMinHeightReached?.();
        return;
      }

      targetState = Math.max(0, startStateRef.current - 1) as 0 | 1 | 2;
    } else {
      return; // 임계값 미만 터치/탭은 상태 유지
    }

    const hasStateChanged = targetState !== startStateRef.current;
    let targetHeight = finalMidHeight;

    if (targetState === 0) {
      targetHeight = finalMinHeight;
      if (hasStateChanged) onMinHeightReached?.();
    } else if (targetState === 1) {
      targetHeight = finalMidHeight;
      if (hasStateChanged) onMidHeightReached?.();
    } else {
      targetHeight = finalMaxHeight;
      if (hasStateChanged) onMaxHeightReached?.();
    }

    setSheetState(targetState);
    setSheetHeight(targetHeight);
  };

  return {
    sheetHeight,
    setSheetHeight,
    translateY: 0,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd
    },
    minHeight: finalMinHeight,
    midHeight: finalMidHeight,
    maxHeight: finalMaxHeight
  };
}

