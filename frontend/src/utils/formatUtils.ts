// Format currency
export const formatCurrency = (value: number | string, currency = 'INR'): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
};

// Format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Format percentage
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Truncate text
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// Turn a verbose gateway_response.message into a short, human-friendly reason
// e.g. "NPCI: INVALID ACCOUNT AND REVERSAL IS SUCCESSFUL" -> "Invalid account".
// Returns '' when there is no meaningful message to show.
export const formatPayoutReason = (message?: string | null): string => {
  if (!message) return '';

  const m = message.toLowerCase();

  // Map known gateway/NPCI messages to a concise label.
  if (m.includes('invalid account')) return 'Invalid account';
  if (m.includes('account closed') || m.includes('account blocked')) return 'Account closed/blocked';
  if (m.includes('insufficient')) return 'Insufficient balance';
  if (m.includes('name mismatch') || m.includes('name not match')) return 'Name mismatch';
  if (m.includes('ifsc')) return 'Invalid IFSC';
  if (m.includes('beneficiary')) return 'Beneficiary issue';
  if (m.includes('limit')) return 'Limit exceeded';
  if (m.includes('timeout') || m.includes('timed out') || m.includes('time out')) return 'Timed out';
  if (m.includes('declin')) return 'Declined by bank';
  if (m.includes('duplicate')) return 'Duplicate request';

  // Fallback: strip a leading "NPCI:"/"gateway:" prefix and a trailing
  // "and reversal is successful" note, then title-case and truncate.
  let cleaned = message
    .replace(/^[a-z ]+:\s*/i, '')
    .replace(/\s+and reversal is successful\.?$/i, '')
    .trim();

  if (cleaned.length > 40) cleaned = `${cleaned.substring(0, 40)}...`;

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
};

// Format transaction status
export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    completed: 'bg-success-100 text-success-800',
    success: 'bg-success-100 text-success-800',
    processing: 'bg-warning-100 text-warning-800',
    pending: 'bg-warning-100 text-warning-800',
    failed: 'bg-error-100 text-error-800',
    approved: 'bg-success-100 text-success-800',
    rejected: 'bg-error-100 text-error-800',
    resolved: 'bg-success-100 text-success-800',
    cancelled: 'bg-error-100 text-error-800',
  };

  return statusColors[status] || 'bg-gray-100 text-gray-800';
};