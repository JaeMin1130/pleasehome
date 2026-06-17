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
