/**
 * 보증금 ↔ 월세 전환 계산 함수
 * sliderValue: -100 (보증금 최대 감액) ~ 0 (기준) ~ +100 (보증금 최대 증액)
 */
export function calcConversion(
  baseDeposit: number,
  baseRent: number,
  sliderValue: number,
  increaseRate: number | null,
  decreaseRate: number | null,
  increaseLimitRate: number | null,
  decreaseLimitRate: number | null,
): { deposit: number; rent: number } {
  if (sliderValue === 0) {
    return { deposit: baseDeposit, rent: baseRent };
  }

  if (sliderValue > 0 && increaseRate && increaseRate > 0) {
    // 보증금 증액 (월세 → 보증금): 월세를 보증금으로 전환
    const limitRate = (increaseLimitRate ?? 0) / 100;
    const maxConvertibleRent = baseRent * limitRate;
    const ratio = sliderValue / 100;
    const convertRent = maxConvertibleRent * ratio;
    const addDeposit = Math.round((convertRent * 12) / (increaseRate / 100));
    return {
      deposit: baseDeposit + addDeposit,
      rent: Math.round(baseRent - convertRent),
    };
  }

  if (sliderValue < 0 && decreaseRate && decreaseRate > 0) {
    // 보증금 감액 (보증금 → 월세): 보증금을 월세로 전환
    const limitRate = (decreaseLimitRate ?? 0) / 100;
    const maxConvertibleDeposit = baseDeposit * limitRate;
    const ratio = Math.abs(sliderValue) / 100;
    const reduceDeposit = maxConvertibleDeposit * ratio;
    const addRent = Math.floor((reduceDeposit * (decreaseRate / 100)) / 12 / 100) * 100;
    return {
      deposit: Math.round(baseDeposit - reduceDeposit),
      rent: baseRent + addRent,
    };
  }

  return { deposit: baseDeposit, rent: baseRent };
}
