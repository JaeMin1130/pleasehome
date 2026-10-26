import { useState } from 'react';
import styles from './PanelEdgeToggle.module.css';

interface PanelEdgeToggleProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// 패널 폭 트랜지션(0.3s)보다 조금 길게
const SUPPRESS_HOVER_MS = 350;

// 패널 우측변 가운데의 얇은 막대, 호버 시 펼칠/접을 방향으로 원형 화살표가 나옴 (웹 전용, 부모 패널이 position 기준이고 overflow로 자르지 않아야 함)
export default function PanelEdgeToggle({ isExpanded, onToggle }: PanelEdgeToggleProps) {
  // 클릭 후 패널 폭이 바뀌며 막대가 커서 아래를 지나갈 때 반대 방향 원이 번쩍이지 않도록 잠시 호버 표시를 끔
  const [isHoverSuppressed, setIsHoverSuppressed] = useState(false);
  const label = isExpanded ? '패널 접기' : '패널 펼치기';
  const handleClick = () => {
    setIsHoverSuppressed(true);
    setTimeout(() => setIsHoverSuppressed(false), SUPPRESS_HOVER_MS);
    onToggle();
  };
  return (
    <button
      className={`${styles['panel-edge-toggle']} ${isExpanded ? styles.expanded : ''} ${isHoverSuppressed ? styles.suppressed : ''}`}
      onClick={handleClick} aria-label={label} title={label}
    >
      <span className={styles['panel-edge-circle']}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points={isExpanded ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
        </svg>
      </span>
    </button>
  );
}
