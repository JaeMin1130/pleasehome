import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from '@testing-library/react';
import { clickable } from './a11y';

describe('clickable', () => {
  it('Enter·Space로 실행되고, 안쪽 버튼에서 올라온 키 입력은 무시한다', () => {
    const onActivate = vi.fn();
    render(
      <div {...clickable(onActivate, { pressed: true })}>
        카드 <button>찜</button>
      </div>
    );
    const card = screen.getByRole('button', { name: /카드/ });
    expect(card).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    fireEvent.keyDown(card, { key: 'a' });
    fireEvent.keyDown(screen.getByRole('button', { name: '찜' }), { key: 'Enter' });

    expect(onActivate).toHaveBeenCalledTimes(2);
  });
});
