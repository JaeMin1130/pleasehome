"use client";

import { PREFERRED_REGIONS } from '@/constants';
import styles from './RegionPicker.module.css';

interface RegionPickerProps {
  value: string; // '11,41'처럼 쉼표로 이은 지역코드
  onChange: (value: string) => void;
}

// 백엔드 비수도권 코드 목록
const NON_CAPITAL_CODES = ['26', '27', '29', '30', '31', '36110', '42', '43', '44', '52', '46', '47', '48', '50'];

// 관심 공고 지역 복수 선택 칩 (서울, 인천, 경기, 기타 4종)
export default function RegionPicker({ value, onChange }: RegionPickerProps) {
  const currentCodes = value.split(',').map(s => s.trim()).filter(Boolean);

  const isChecked = (code: string) => {
    if (code === 'ETC') {
      return NON_CAPITAL_CODES.some(c => currentCodes.includes(c));
    }
    return currentCodes.includes(code);
  };

  const toggle = (code: string) => {
    let next: string[];
    if (code === 'ETC') {
      const hasEtc = NON_CAPITAL_CODES.some(c => currentCodes.includes(c));
      if (hasEtc) {
        next = currentCodes.filter(c => !NON_CAPITAL_CODES.includes(c));
      } else {
        next = [...currentCodes, ...NON_CAPITAL_CODES];
      }
    } else {
      if (currentCodes.includes(code)) {
        next = currentCodes.filter(c => c !== code);
      } else {
        next = [...currentCodes, code];
      }
    }
    onChange(next.join(','));
  };

  return (
    <div className={styles.chips}>
      {PREFERRED_REGIONS.map(r => {
        const active = isChecked(r.code);
        return (
          <label key={r.code} className={`${styles.chip} ${active ? styles.chipActive : ''}`}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={active}
              onChange={() => toggle(r.code)}
            />
            {r.name}
          </label>
        );
      })}
    </div>
  );
}
