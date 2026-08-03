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

// Turn a verbose gateway_response.message into a short, human-friendly reason
// e.g. "NPCI: INVALID ACCOUNT AND REVERSAL IS SUCCESSFUL" -> "Invalid account".
// Returns '' when there is no meaningful message to show.
export const formatPayoutReason = (message?: string | null): string => {
  if (!message) return ''

  const m = message.toLowerCase()

  // Map known gateway/NPCI messages to a concise label.
  if (m.includes('invalid account')) return 'Invalid account'
  if (m.includes('account closed') || m.includes('account blocked')) return 'Account closed/blocked'
  if (m.includes('insufficient')) return 'Insufficient balance'
  if (m.includes('name mismatch') || m.includes('name not match')) return 'Name mismatch'
  if (m.includes('ifsc')) return 'Invalid IFSC'
  if (m.includes('beneficiary')) return 'Beneficiary issue'
  if (m.includes('limit')) return 'Limit exceeded'
  if (m.includes('timeout') || m.includes('timed out') || m.includes('time out')) return 'Timed out'
  if (m.includes('declin')) return 'Declined by bank'
  if (m.includes('duplicate')) return 'Duplicate request'

  // Fallback: strip a leading "NPCI:"/"gateway:" prefix and a trailing
  // "and reversal is successful" note, then title-case and truncate.
  let cleaned = message
    .replace(/^[a-z ]+:\s*/i, '')
    .replace(/\s+and reversal is successful\.?$/i, '')
    .trim()

  if (cleaned.length > 40) cleaned = `${cleaned.substring(0, 40)}...`

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
}

export const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' | 'info' => {
  const s = status?.toLowerCase()
  if (s === 'success' || s === 'approved' || s === 'active') return 'success'
  if (s === 'failed' || s === 'rejected' || s === 'inactive') return 'error'
  if (s === 'pending' || s === 'processing') return 'warning'
  if (s === 'refunded') return 'info'
  return 'default'
}
