export function formatMoney(amount, fiat) {
  const n = Number(amount || 0)
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: fiat,
    maximumFractionDigits: 2
  }).format(n)
}

export function formatNumber(amount) {
  const n = Number(amount || 0)
  return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 8 }).format(n)
}
