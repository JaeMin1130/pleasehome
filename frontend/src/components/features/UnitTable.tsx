import React, { useState, useEffect } from 'react';
import { HousingUnit } from '@/types';
import { formatMoney, formatRent, formatTargetGroup } from '@/utils/formatters';
import { calcConversion } from '@/utils/conversion';
import styles from './UnitTable.module.css';

interface UnitTableProps {
  units: HousingUnit[];
  sliderValues: Record<number, number>;
  onSliderChange: (unitId: number, value: number) => void;
}

interface TableRowItem {
  unit: HousingUnit;
  isFirstOfType: boolean;
  rowSpan: number;
}

export default function UnitTable({
  units,
  sliderValues,
  onSliderChange,
}: UnitTableProps) {
  const [expandedUnitId, setExpandedUnitId] = useState<number | null>(null);
  const [tableRows, setTableRows] = useState<TableRowItem[]>([]);

  // 주택 목록을 정렬 및 rowspan 처리를 위한 가공
  useEffect(() => {
    const sorted = [...units].sort((a, b) => {
      const typeA = a.room_type || '';
      const typeB = b.room_type || '';
      if (typeA !== typeB) return typeA.localeCompare(typeB);

      const targetA = a.target_group || '';
      const targetB = b.target_group || '';
      if (targetA !== targetB) return targetA.localeCompare(targetB);

      return (a.income_group || '').localeCompare(b.income_group || '');
    });

    const rows: TableRowItem[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const previous = i > 0 ? sorted[i - 1] : null;

      if (!previous || previous.room_type !== current.room_type) {
        let count = 1;
        for (let j = i + 1; j < sorted.length; j++) {
          if (sorted[j].room_type === current.room_type) {
            count++;
          } else {
            break;
          }
        }
        rows.push({
          unit: current,
          isFirstOfType: true,
          rowSpan: count,
        });
      } else {
        rows.push({
          unit: current,
          isFirstOfType: false,
          rowSpan: 0,
        });
      }
    }
    setTableRows(rows);
  }, [units]);

  const toggleExpand = (unitId: number) => {
    setExpandedUnitId((prev) => (prev === unitId ? null : unitId));
  };

  return (
    <div className={styles['table-container']}>
      <table className={styles['unit-table']}>
        <thead>
          <tr>
            <th>주택형 (면적)</th>
            <th>호실</th>
            <th>방 개수</th>
            <th>공급 호수</th>
            <th>임대 보증금</th>
            <th>월 임대료</th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map(({ unit, isFirstOfType, rowSpan }) => {
            const isExpanded = expandedUnitId === unit.id;

            // 전환 슬라이더용 값
            const sliderVal = sliderValues[unit.id] ?? unit.deposit;
            const hasConversion =
              unit.max_deposit !== null &&
              unit.min_deposit !== null &&
              unit.max_monthly_rent !== null &&
              unit.min_monthly_rent !== null &&
              unit.max_deposit > unit.deposit;

            const diffMax = unit.max_deposit !== null ? Math.abs(unit.max_deposit - unit.deposit) : 0;
            const diffMin = unit.min_deposit !== null ? Math.abs(unit.deposit - unit.min_deposit) : 0;
            const referenceDiff = diffMax > 0 ? diffMax : (diffMin > 0 ? diffMin : 0);

            let step = 1000000;
            if (referenceDiff > 0) {
              if (referenceDiff % 1000000 === 0) {
                step = 1000000;
              } else {
                step = 100000;
              }
            }

            const converted = hasConversion
              ? calcConversion(
                  unit.deposit,
                  unit.monthly_rent,
                  sliderVal,
                  unit.max_deposit,
                  unit.min_deposit,
                  unit.max_monthly_rent,
                  unit.min_monthly_rent,
                )
              : null;

            const diffAmount = sliderVal - unit.deposit;

            return (
              <React.Fragment key={unit.id}>
                {/* 메인 데이터 행 */}
                <tr
                  className={`${styles['row-clickable']} ${isExpanded ? styles['row-active'] : ''}`}
                  onClick={() => toggleExpand(unit.id)}
                >
                  {isFirstOfType && (
                    <td rowSpan={rowSpan} className={styles['bold-text']}>
                      {unit.room_type || `${unit.exclusive_area}형`}
                      <span className={styles['area-text']}>
                        ({unit.exclusive_area.toFixed(2)}㎡ / ~{Math.round(unit.exclusive_area * 0.3025)}평)
                      </span>
                    </td>
                  )}
                  <td>{unit.room_number || '-'}</td>
                  <td>{unit.room_count ? `${unit.room_count}개` : '-'}</td>
                  <td>
                    <span className={styles['bold-text']}>{unit.supply_count}호</span>
                    {unit.reserve_count > 0 && ` (예비 ${unit.reserve_count}호)`}
                  </td>
                  <td>
                    {converted && diffAmount !== 0 ? formatMoney(converted.deposit) : formatMoney(unit.deposit)}
                  </td>
                  <td>
                    {converted && diffAmount !== 0 ? formatRent(converted.rent) : formatRent(unit.monthly_rent)}
                  </td>
                </tr>

                {/* 아코디언 확장 영역 (방안 1: 모의 계산 슬라이더) */}
                {isExpanded && (
                  <tr className={styles['accordion-row']}>
                    <td colSpan={6} className={styles['accordion-cell']}>
                      <div className={styles['conversion-box']}>
                        {hasConversion && unit.monthly_rent > 0 ? (
                          <>
                            <div className={styles['conversion-header']}>
                              <div className={styles['conversion-title-wrap']}>
                                <span className={styles['conversion-title']}>보증금 ↔ 월세 전환 모의 계산</span>
                                {diffAmount !== 0 && converted && converted.effectiveRate !== null && (
                                  <span className={styles['conversion-rate-text']}>
                                    (적용 전환율: 연 {converted.effectiveRate.toFixed(2)}%)
                                  </span>
                                )}
                              </div>
                              {diffAmount !== 0 && (
                                <button
                                  className={styles['reset-btn']}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSliderChange(unit.id, unit.deposit);
                                  }}
                                >
                                  초기화
                                </button>
                              )}
                            </div>
                            
                            <div className={styles['slider-track-wrap']}>
                              <span className={styles['slider-label']}>보증금↓</span>
                              <input
                                type="range"
                                className={styles['conversion-slider']}
                                min={unit.min_deposit || 0}
                                max={unit.max_deposit || 0}
                                step={step}
                                value={sliderVal}
                                onChange={(e) => onSliderChange(unit.id, parseInt(e.target.value, 10))}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className={styles['slider-label']}>보증금↑</span>
                            </div>

                            <div className={styles['conversion-result-preview']}>
                              <div className={styles['result-item']}>
                                <span className={styles['result-lbl']}>최종 보증금</span>
                                <div className={styles['result-val-wrap']}>
                                  <span className={styles['result-val']}>
                                    {formatMoney(converted ? converted.deposit : unit.deposit)}
                                  </span>
                                  {diffAmount !== 0 && (
                                    <span className={`${styles['diff-text']} ${diffAmount > 0 ? styles.up : styles.down}`}>
                                      {diffAmount > 0 ? (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles['diff-icon']}>
                                          <line x1="12" y1="19" x2="12" y2="5"></line>
                                          <polyline points="5 12 12 5 19 12"></polyline>
                                        </svg>
                                      ) : (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles['diff-icon']}>
                                          <line x1="12" y1="5" x2="12" y2="19"></line>
                                          <polyline points="19 12 12 19 5 12"></polyline>
                                        </svg>
                                      )} {formatMoney(Math.abs((converted ? converted.deposit : unit.deposit) - unit.deposit))}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className={styles['result-item']}>
                                <span className={styles['result-lbl']}>최종 월 임대료</span>
                                <div className={styles['result-val-wrap']}>
                                  <span className={styles['result-val']}>
                                    {formatRent(converted ? converted.rent : unit.monthly_rent)}
                                  </span>
                                  {diffAmount !== 0 && (
                                    <span className={`${styles['diff-text']} ${diffAmount > 0 ? styles.down : styles.up}`}>
                                      {diffAmount > 0 ? (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles['diff-icon']}>
                                          <line x1="12" y1="5" x2="12" y2="19"></line>
                                          <polyline points="19 12 12 19 5 12"></polyline>
                                        </svg>
                                      ) : (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles['diff-icon']}>
                                          <line x1="12" y1="19" x2="12" y2="5"></line>
                                          <polyline points="5 12 12 5 19 12"></polyline>
                                        </svg>
                                      )} {formatRent(Math.abs((converted ? converted.rent : unit.monthly_rent) - unit.monthly_rent))}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className={styles['no-conversion-msg']}>
                            해당 공급 조건은 보증금 ↔ 월세 상호 전환이 불가한 조건입니다.
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
