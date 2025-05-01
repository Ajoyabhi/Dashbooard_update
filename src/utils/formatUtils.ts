// Format currency
export const formatCurrency = (value: number | string, currency = 'USD'): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  return new Intl.NumberFormat('en-US', {
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

// Format transaction status
export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    completed: 'bg-success-100 text-success-800',
    Successful: 'bg-success-100 text-success-800',
    pending: 'bg-warning-100 text-warning-800',
    failed: 'bg-error-100 text-error-800',
    approved: 'bg-success-100 text-success-800',
    rejected: 'bg-error-100 text-error-800',
    resolved: 'bg-success-100 text-success-800',
    cancelled: 'bg-error-100 text-error-800',
  };
  
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};