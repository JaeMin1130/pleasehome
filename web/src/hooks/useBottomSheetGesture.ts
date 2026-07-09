import { useRef, useState, useEffect } from 'react';

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
  const finalMidHeight = midHeight ?? getDvhInPixels(50);
  const finalMaxHeight = maxHeight ?? getDvhInPixels(85);

  const [sheetHeight, setSheetHeight] = useState<number | null>(null);
  const [sheetState, setSheetState] = useState<0 | 1 | 2>(1); // 0: MIN, 1: MID, 2: MAX (기본값 MID)
  const [translateY, setTranslateY] = useState<number>(0);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const startStateRef = useRef<0 | 1 | 2>(1);

  // 외부 싱크 연동 (드래그 중이 아닐 때 sheetHeight 변화를 sheetState에 동기화)
  useEffect(() => {
    if (isDraggingRef.current) return;
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

    // 터치가 발생한 구체적인 자식 요소에 구애받지 않고, 항상 최상위 시트 컨테이너(aside 또는 패널)의 높이를 구합니다.
    const asideEl = e.currentTarget.closest('aside, [class*="app-detail-panel"]') as HTMLElement || e.currentTarget;
    if (asideEl) {
      startHeightRef.current = asideEl.getBoundingClientRect().height;
      asideEl.style.transition = 'none';
    } else {
      startHeightRef.current = sheetHeight ?? finalMidHeight;
    }

    startYRef.current = e.touches[0].clientY;
    startStateRef.current = sheetState; // 드래그 시작 시점의 플래그 기록
    isDraggingRef.current = true;
    setTranslateY(0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    if (typeof window !== 'undefined' && window.innerWidth > 768) return;

    const deltaY = e.touches[0].clientY - startYRef.current;
    const currentHeight = startHeightRef.current;

    const isAtMax = sheetState === 2;

    // 1. [예외] 이미 최대 높이 상태(MAX)에서 위로 쓸어올릴 때(deltaY < 0)는 
    // 시트를 더 키울 수 없으므로, 기본 스크롤바(아래로 내림)가 작동하도록 즉시 리턴합니다.
    if (isAtMax && deltaY < 0) {
      return;
    }

    // 스크롤 컨테이너 탐색
    const scrollContainer = e.currentTarget.className.includes('sidebar-list') 
      ? e.currentTarget 
      : e.currentTarget.querySelector(scrollSelector) as HTMLElement;

    const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

    // 2. [예외] 시트가 최대 높이 상태(MAX)이고 스크롤바가 내려가 있는 상태(scrollTop > 0)라면
    // 스크롤바가 위로 올라가야 하므로, 즉시 리턴하여 기본 스크롤에 양보합니다.
    if (isAtMax && scrollTop > 0) {
      return;
    }

    // 3. 그 외 모든 상황(시트 높이가 중간/최소이거나, 최대 높이이면서 스크롤이 최상단일 때 내릴 때 등)
    // 브라우저 기본 스크롤을 차단하고 시트 크기만 제어합니다.
    if (e.cancelable) e.preventDefault();
    
    // 계산된 대상 높이
    const targetHeight = currentHeight - deltaY;

    if (targetHeight < finalMinHeight) {
      // 💡 최소 높이 이하로 내려갈 때는 높이를 최소 높이로 고정하고, 아래로 밀린 변위만큼 translateY를 적용
      setSheetHeight(finalMinHeight);
      setTranslateY(finalMinHeight - targetHeight);
    } else {
      // 💡 최소 높이보다 클 때는 translateY를 0으로 하고 높이만 조절
      const nextHeight = Math.min(finalMaxHeight, targetHeight);
      setSheetHeight(nextHeight);
      setTranslateY(0);
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

    // 터치 종료 시점의 deltaY 계산
    const endY = e.changedTouches?.[0]?.clientY ?? startYRef.current;
    const deltaY = endY - startYRef.current;

    // 스크롤 컨테이너 및 위치 탐색
    const scrollContainer = e.currentTarget.className.includes('sidebar-list') 
      ? e.currentTarget 
      : e.currentTarget.querySelector(scrollSelector) as HTMLElement;

    const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

    let targetState = startStateRef.current;
    const swipeThreshold = 40; // 쫀쫀한 동작을 위해 임계값 40px로 복구

    if (deltaY < -swipeThreshold) {
      // 위로 스와이프 (+1 단계)
      targetState = Math.min(2, startStateRef.current + 1) as 0 | 1 | 2;
    } else if (deltaY > swipeThreshold) {
      // 아래로 스와이프 (-1 단계)
      if (startStateRef.current === 2 && scrollTop > 0) {
        targetState = 2;
      } else {
        targetState = Math.max(0, startStateRef.current - 1) as 0 | 1 | 2;

        // 💡 이미 최소 높이(0) 상태에서 아래로 더 쓸어내린 경우 닫기 콜백을 직접 실행하고 종료
        if (startStateRef.current === 0) {
          onMinHeightReached?.();
          setTranslateY(0);
          return;
        }
      }
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
    setTranslateY(0); // 스냅 완료 시 평행이동 초기화
  };

  return {
    sheetHeight,
    setSheetHeight,
    translateY,
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
