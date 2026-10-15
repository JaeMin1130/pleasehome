import type { KeyboardEvent } from 'react';

// div/span으로 만든 클릭 요소를 키보드(Tab·Enter·Space)와 스크린리더에서도 버튼처럼 쓰게 한다.
// 카드 안의 다른 버튼(찜 등)에서 올라온 키 입력은 무시해 카드가 함께 토글되지 않게 한다.
export function clickable(onActivate: () => void, state: { pressed?: boolean; expanded?: boolean } = {}) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-pressed': state.pressed,
    'aria-expanded': state.expanded,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      onActivate();
    },
  };
}
