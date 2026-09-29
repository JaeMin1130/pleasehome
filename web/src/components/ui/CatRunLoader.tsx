import styles from './CatRunLoader.module.css';

interface CatRunLoaderProps {
  label?: string;
  // 215×120 원본 대비 배율. 프레임 경계가 픽셀에 맞도록 215·120이 모두 정수가 되는 값(0.2 단위)을 쓴다.
  scale?: number;
}

// 이루가 달리는 스프라이트 로더 (6프레임, docs/design/skeleton.jpg 원본에서 추출)
export default function CatRunLoader({ label, scale = 1 }: CatRunLoaderProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.sprite} style={{ '--cat-scale': scale } as React.CSSProperties} role="img" aria-label="로딩 중" />
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
