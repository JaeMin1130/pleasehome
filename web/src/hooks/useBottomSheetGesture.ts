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

  const finalMinHeight = minHeight ?? getDvh(20);
  const finalMidHeight = midHeight ?? getDvh(50);
  const finalMaxHeight = maxHeight ?? getDvh(85);

  const [sheetHeight, setSheetHeight] = useState<number | null>(null);
  const [sheetState, setSheetState] = useState<0 | 1 | 2>(1); // 0: MIN, 1: MID, 2: MAX
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const startStateRef = useRef<0 | 1 | 2>(1);
  const isDraggingRef = useRef(false);
  const isHandleTouchedRef = useRef(false);

  // 외부(isCollapsed 등)에서 sheetHeight가 변경될 때 sheetState 동기화
  useEffect(() => {
    if (sheetHeight === null) return;
    if (Math.abs(sheetHeight - finalMinHeight) < 15) {
      setSheetState(0);
    } else if (Math.abs(sheetHeight - finalMidHeight) < 15) {
      setSheetState(1);
    } else if (Math.abs(sheetHeight - finalMaxHeight) < 15) {
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

    const isHandle = Boolean(target.closest('[class*="drag-handle-bar"]'));
    isHandleTouchedRef.current = isHandle;
    startYRef.current = e.touches[0].clientY;
    startHeightRef.current = sheetHeight ?? (sheetState === 0 ? finalMinHeight : sheetState === 1 ? finalMidHeight : finalMaxHeight);
    startStateRef.current = sheetState;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    if (typeof window !== 'undefined' && window.innerWidth > 768) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;

    // 핸들바를 잡지 않은 경우 스크롤 위치 확인
    if (!isHandleTouchedRef.current) {
      const scrollContainer = e.currentTarget.className.includes('sidebar-list') 
        ? e.currentTarget 
        : e.currentTarget.querySelector(scrollSelector) as HTMLElement;
      const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

      // 최대 높이에서 내부 스크롤을 내리는 중이면 시트 드래그 비활성화
      if (startStateRef.current === 2 && deltaY > 0 && scrollTop > 5) {
        return;
      }
    }

    // 손가락 움직임에 따라 실시간 높이 계산
    const nextHeight = Math.max(finalMinHeight, Math.min(finalMaxHeight + 30, startHeightRef.current - deltaY));
    setSheetHeight(nextHeight);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (typeof window !== 'undefined' && window.innerWidth > 768) return;

    const endY = e.changedTouches?.[0]?.clientY ?? startYRef.current;
    const deltaY = endY - startYRef.current;

    // 1. 핸들바 탭 (클릭) 시 순환 토글 (MIN -> MID -> MAX -> MID)
    if (isHandleTouchedRef.current && Math.abs(deltaY) < 10) {
      let nextState: 0 | 1 | 2 = 1;
      if (sheetState === 0) nextState = 1;
      else if (sheetState === 1) nextState = 2;
      else nextState = 1;

      const targetHeight = nextState === 0 ? finalMinHeight : nextState === 1 ? finalMidHeight : finalMaxHeight;
      setSheetState(nextState);
      setSheetHeight(targetHeight);
      if (nextState === 0) onMinHeightReached?.();
      else if (nextState === 1) onMidHeightReached?.();
      else onMaxHeightReached?.();
      return;
    }

    // 2. 현재 높이 기준으로 가장 가까운 스냅 포인트 찾기
    const currentH = sheetHeight ?? startHeightRef.current;
    const distMin = Math.abs(currentH - finalMinHeight);
    const distMid = Math.abs(currentH - finalMidHeight);
    const distMax = Math.abs(currentH - finalMaxHeight);

    let targetState: 0 | 1 | 2 = 1;

    // 빠른 스와이프 제스처 우선 판별
    if (deltaY < -40) {
      // 위로 빠른 스와이프
      targetState = Math.min(2, startStateRef.current + 1) as 0 | 1 | 2;
    } else if (deltaY > 40) {
      // 아래로 빠른 스와이프
      targetState = Math.max(0, startStateRef.current - 1) as 0 | 1 | 2;
    } else {
      // 근접한 스냅 지점 선택
      if (distMin <= distMid && distMin <= distMax) targetState = 0;
      else if (distMid <= distMin && distMid <= distMax) targetState = 1;
      else targetState = 2;
    }

    const targetHeight = targetState === 0 ? finalMinHeight : targetState === 1 ? finalMidHeight : finalMaxHeight;
    setSheetState(targetState);
    setSheetHeight(targetHeight);

    if (targetState === 0) onMinHeightReached?.();
    else if (targetState === 1) onMidHeightReached?.();
    else onMaxHeightReached?.();
  };

  return {
    sheetHeight,
    setSheetHeight,
    translateY: 0,
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

