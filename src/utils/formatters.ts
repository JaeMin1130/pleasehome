export const formatMoney = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    return `${eok}억 ${man > 0 ? man.toLocaleString() + '만' : ''}원`;
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toLocaleString()}만 원`;
  }
  return `${amount.toLocaleString()}원`;
};

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return dateStr;
  }
};

export const formatInterestRate = (rate: number | null | undefined): string => {
  if (rate === null || rate === undefined) return '-';
  return `${rate.toFixed(1)}%`;
};

export const formatRent = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  return `${amount.toLocaleString()}원`;
};

export const formatTargetGroup = (group: string | null | undefined): string => {
  if (!group) return '-';
  const mapping: Record<string, string> = {
    '우선공급/일반공급': '우선/일반',
    '일반공급': '일반',
    '신혼부부·한부모가족': '신혼/한부모',
    '신혼부부·한부모가족(주거약자)': '신혼/한부모(약자)',
    '고령자(주거약자용)': '고령자(약자)',
    '고령자(주거약자용 외)': '고령자(일반)',
    '대학생/청년(소득 무)': '대학생/청년(소득無)',
    '청년(소득 무)': '청년(소득無)',
    '청년(소득 유)': '청년(소득有)',
    '산업단지근로자, 신혼부부, 한부모가족': '산단/신혼/한부모',
    '산업단지근로자': '산단근로자',
    '주거급여수급자': '주거급여수급',
  };
  return mapping[group.trim()] || group;
};
