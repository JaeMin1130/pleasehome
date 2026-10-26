import styles from './PanelEdgeToggle.module.css';

interface PanelEdgeToggleProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// 패널 우측변 가운데에 붙는 펼치기/접기 원형 버튼 (웹 전용, 부모 패널이 position 기준이고 overflow로 자르지 않아야 함)
export default function PanelEdgeToggle({ isExpanded, onToggle }: PanelEdgeToggleProps) {
  const label = isExpanded ? '패널 접기' : '패널 펼치기';
  return (
    <button className={`${styles['panel-edge-toggle']} ${isExpanded ? styles.expanded : ''}`} onClick={onToggle} aria-label={label} title={label}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points={isExpanded ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
      </svg>
    </button>
  );
}
