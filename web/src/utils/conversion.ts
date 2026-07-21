/**
 * 보증금 ↔ 월세 100만원 단위 전환 계산 함수 (개별 주택 한도액 기준)
 * targetDeposit: 목표 보증금 (원 단위)
 */
export function calcConversion(
  baseDeposit: number,
  baseRent: number,
  targetDeposit: number,
  maxDeposit: number | null,
  minDeposit: number | null,
  maxMonthlyRent: number | null,
  minMonthlyRent: number | null,
): { deposit: number; rent: number; effectiveRate: number | null } {
  if (
    targetDeposit === baseDeposit ||
    maxDeposit === null ||
    minDeposit === null ||
    maxMonthlyRent === null ||
    minMonthlyRent === null
  ) {
    return { deposit: baseDeposit, rent: baseRent, effectiveRate: null };
  }

  // 1. 보증금 증액 시 (targetDeposit > baseDeposit)
  if (targetDeposit > baseDeposit && maxDeposit > baseDeposit) {
    const diffDeposit = targetDeposit - baseDeposit;
    const maxDiffDeposit = maxDeposit - baseDeposit;
    if (maxDiffDeposit <= 0) return { deposit: baseDeposit, rent: baseRent, effectiveRate: null };

    const diffRent = baseRent - minMonthlyRent;
    const calculatedRent = baseRent - (diffDeposit * diffRent) / maxDiffDeposit;
    
    // 이율 역산: ((기본월세 - 최소월세) * 12) / (최대보증금 - 기본보증금) * 100
    const effectiveRate = ((baseRent - minMonthlyRent) * 12) / maxDiffDeposit * 100;

    return {
      deposit: targetDeposit,
      rent: Math.max(minMonthlyRent, Math.round(calculatedRent)),
      effectiveRate: isNaN(effectiveRate) || !isFinite(effectiveRate) ? null : effectiveRate,
    };
  }

  // 2. 보증금 감액 시 (targetDeposit < baseDeposit)
  if (targetDeposit < baseDeposit && baseDeposit > minDeposit) {
    const diffDeposit = baseDeposit - targetDeposit;
    const maxDiffDeposit = baseDeposit - minDeposit;
    if (maxDiffDeposit <= 0) return { deposit: baseDeposit, rent: baseRent, effectiveRate: null };

    const diffRent = maxMonthlyRent - baseRent;
    const calculatedRent = baseRent + (diffDeposit * diffRent) / maxDiffDeposit;

    // 이율 역산: ((최대월세 - 기본월세) * 12) / (기본보증금 - 최소보증금) * 100
    const effectiveRate = ((maxMonthlyRent - baseRent) * 12) / maxDiffDeposit * 100;

    return {
      deposit: targetDeposit,
      rent: Math.min(maxMonthlyRent, Math.round(calculatedRent)),
      effectiveRate: isNaN(effectiveRate) || !isFinite(effectiveRate) ? null : effectiveRate,
    };
  }

  return { deposit: baseDeposit, rent: baseRent, effectiveRate: null };
}

