export function periodLabel(year) {
  return year === 'early' ? 'Tanto tempo fa...' : String(year);
}

export function comparePeriods(left, right) {
  if (left === right) return 0;
  if (left === 'early') return -1;
  if (right === 'early') return 1;
  return Number(left) - Number(right);
}
