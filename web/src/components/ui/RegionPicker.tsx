"use client";

import { PREFERRED_REGIONS } from '@/constants';
import styles from './RegionPicker.module.css';

interface RegionPickerProps {
  value: string; // '11,41'처럼 쉼표로 이은 지역코드
  onChange: (value: string) => void;
}

// 관심 공고 지역 복수 선택 칩 (회원가입·회원정보 수정 공용)
export default function RegionPicker({ value, onChange }: RegionPickerProps) {
  const selected = value.split(',').filter(Boolean);

  const toggle = (code: string) => {
    const next = selected.includes(code) ? selected.filter(c => c !== code) : [...selected, code];
    onChange(PREFERRED_REGIONS.map(r => r.code).filter(c => next.includes(c)).join(','));
  };

  return (
    <div className={styles.chips}>
      {PREFERRED_REGIONS.map(r => (
        <label key={r.code} className={`${styles.chip} ${selected.includes(r.code) ? styles.chipActive : ''}`}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={selected.includes(r.code)}
            onChange={() => toggle(r.code)}
          />
          {r.name}
        </label>
      ))}
    </div>
  );
}
