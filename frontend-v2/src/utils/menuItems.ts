export interface NavItem {
  label: string
  path: string
  icon: string
  section?: string
}

export const adminMenu: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: 'LayoutDashboard', section: 'Overview' },
  { label: 'Manage Users', path: '/admin/manage-user', icon: 'Users', section: 'User Management' },
  { label: 'Manage Staff', path: '/admin/manage-staff', icon: 'UserCog', section: 'User Management' },
  { label: 'Manage Payout', path: '/admin/manage-payout', icon: 'ArrowUpCircle', section: 'Payments' },
  { label: 'Bulk Payout', path: '/admin/bulk-payout', icon: 'Layers', section: 'Payments' },
  { label: 'Fund Requests', path: '/admin/manage-fund-request', icon: 'Landmark', section: 'Finance' },
  { label: 'Settlement', path: '/admin/settlement', icon: 'BadgeCheck', section: 'Finance' },
  { label: 'Payin Report', path: '/admin/payin-report', icon: 'TrendingDown', section: 'Reports' },
  { label: 'Payout Report', path: '/admin/payout-report', icon: 'TrendingUp', section: 'Reports' },
  { label: 'Wallet Report', path: '/admin/wallet-report', icon: 'Wallet', section: 'Reports' },
  { label: 'Chargeback', path: '/admin/chargeback', icon: 'RotateCcw', section: 'Reports' },
  { label: 'Chargeback Report', path: '/admin/chargeback-report', icon: 'FileX', section: 'Reports' },
  { label: 'Trash Reports', path: '/admin/trash-payin-payout-report', icon: 'Trash2', section: 'Reports' },
]

export const userMenu: NavItem[] = [
  { label: 'Dashboard', path: '/user', icon: 'LayoutDashboard', section: 'Overview' },
  { label: 'Fund Request', path: '/user/fund-request', icon: 'Landmark', section: 'Finance' },
  { label: 'Wallet Report', path: '/user/wallet-report', icon: 'Wallet', section: 'Reports' },
  { label: 'Payin Report', path: '/user/payin-report', icon: 'TrendingDown', section: 'Reports' },
  { label: 'Payout Report', path: '/user/payout-report', icon: 'TrendingUp', section: 'Reports' },
  { label: 'Failed History', path: '/user/payout-failed-history', icon: 'AlertCircle', section: 'Reports' },
  { label: 'Wallet History', path: '/user/wallet-transaction-history', icon: 'History', section: 'Reports' },
  { label: 'Settlement', path: '/user/settlement-report', icon: 'BadgeCheck', section: 'Reports' },
  { label: 'Developer Settings', path: '/user/developer-settings', icon: 'Code2', section: 'Developer' },
  { label: 'API Docs', path: '/user/development-docs', icon: 'BookOpen', section: 'Developer' },
]

export const agentMenu: NavItem[] = [
  { label: 'Dashboard', path: '/agent', icon: 'LayoutDashboard', section: 'Overview' },
  { label: 'My Users', path: '/agent/add-users', icon: 'Users', section: 'Management' },
  { label: 'Fund Request', path: '/agent/fund-request', icon: 'Landmark', section: 'Finance' },
  { label: 'Wallet Report', path: '/agent/wallet-report', icon: 'Wallet', section: 'Reports' },
  { label: 'Payin Report', path: '/agent/payin-report', icon: 'TrendingDown', section: 'Reports' },
  { label: 'Payout Report', path: '/agent/payout-report', icon: 'TrendingUp', section: 'Reports' },
  { label: 'Developer Settings', path: '/agent/developer-settings', icon: 'Code2', section: 'Developer' },
  { label: 'API Docs', path: '/agent/development-docs', icon: 'BookOpen', section: 'Developer' },
]
