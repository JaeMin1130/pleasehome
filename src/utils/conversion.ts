/**
 * 보증금 ↔ 월세 100만원 단위 전환 계산 함수
 * sliderValue: 걸음수 (1단위당 1,000,000원 변동)
 * - sliderValue > 0: 보증금 증액 (월세 -> 보증금)
 * - sliderValue < 0: 보증금 감액 (보증금 -> 월세)
 */
export function calcConversion(
  baseDeposit: number,
  baseRent: number,
  sliderValue: number, // 걸음 수 (예: -27 ~ +34)
  increaseRate: number | null,
  decreaseRate: number | null,
  increaseLimitRate: number | null,
  decreaseLimitRate: number | null,
): { deposit: number; rent: number } {
  if (sliderValue === 0) {
    return { deposit: baseDeposit, rent: baseRent };
  }

  if (sliderValue > 0 && increaseRate && increaseRate > 0) {
    // 보증금 증액 (월세 → 보증금): 100만원 단위로 증액
    const addDeposit = sliderValue * 1000000;
    const reduceRent = (addDeposit * (increaseRate / 100)) / 12;
    return {
      deposit: baseDeposit + addDeposit,
      rent: Math.max(0, Math.round(baseRent - reduceRent)),
    };
  }

  if (sliderValue < 0 && decreaseRate && decreaseRate > 0) {
    // 보증금 감액 (보증금 → 월세): 100만원 단위로 감액
    const reduceDeposit = Math.abs(sliderValue) * 1000000;
    const addRent = (reduceDeposit * (decreaseRate / 100)) / 12;
    return {
      deposit: Math.max(0, Math.round(baseDeposit - reduceDeposit)),
      rent: Math.round(baseRent + addRent),
    };
  }

  return { deposit: baseDeposit, rent: baseRent };
}

