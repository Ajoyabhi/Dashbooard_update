export const formatCurrency = (value: number | string, symbol = '₹'): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return `${symbol}0.00`
  return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const formatDate = (date: string | Date): string => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatDateTime = (date: string | Date): string => {
  if (!date) return '-'
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export const formatNumber = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0'
  return num.toLocaleString('en-IN')
}

export const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' | 'info' => {
  const s = status?.toLowerCase()
  if (s === 'success' || s === 'approved' || s === 'active') return 'success'
  if (s === 'failed' || s === 'rejected' || s === 'inactive') return 'error'
  if (s === 'pending' || s === 'processing') return 'warning'
  if (s === 'refunded') return 'info'
  return 'default'
}
