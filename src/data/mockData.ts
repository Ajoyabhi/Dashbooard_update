import { 
  Users, 
  Wallet, 
  Calendar, 
  TrendingUp, 
  ArrowUpRight, 
  CreditCard, 
  BarChart3, 
  UserCog, 
  RotateCcw, 
  Settings, 
  FileCode, 
  HelpCircle, 
  Layers, 
  DollarSign,
  FileText,
  CreditCard as PayinIcon
} from 'lucide-react';

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    avatar: 'https://i.pravatar.cc/150?img=1',
  },
  {
    id: '2',
    name: 'Agent User',
    email: 'agent@example.com',
    role: 'agent',
    avatar: 'https://i.pravatar.cc/150?img=2',
  },
  {
    id: '3',
    name: 'Regular User',
    email: 'user@example.com',
    role: 'user',
    avatar: 'https://i.pravatar.cc/150?img=3',
  },
];

// Mock Transactions
export const mockTransactions: Transaction[] = [
  {
    id: 'txn001',
    amount: 250.50,
    status: 'Successful',
    date: '2025-01-15T10:30:00',
    user: 'John Smith',
    type: 'deposit',
    method: 'payin Card',
  },
  {
    id: 'txn002',
    amount: 75.00,
    status: 'Successful',
    date: '2025-01-16T12:15:00',
    user: 'Emily Johnson',
    type: 'withdrawal',
    method: 'Bank Transfer',
  },
  {
    id: 'txn003',
    amount: 125.75,
    status: 'pending',
    date: '2025-01-17T14:45:00',
    user: 'Michael Brown',
    type: 'payout',
    method: 'PayPal',
  },
  {
    id: 'txn004',
    amount: 100.00,
    status: 'failed',
    date: '2025-01-17T16:30:00',
    user: 'Sarah Wilson',
    type: 'deposit',
    method: 'payin Card',
  },
  {
    id: 'txn005',
    amount: 50.25,
    status: 'Successful',
    date: '2025-01-18T09:20:00',
    user: 'David Taylor',
    type: 'payout',
    method: 'Bank Transfer',
  },
];

// Mock Fund Requests
export const mockFundRequests: FundRequest[] = [
  {
    id: 'fr001',
    userId: '3',
    userName: 'Regular User',
    amount: 500.00,
    status: 'pending',
    date: '2025-01-15T11:00:00',
    method: 'Bank Transfer',
  },
  {
    id: 'fr002',
    userId: '3',
    userName: 'Emily Johnson',
    amount: 250.00,
    status: 'approved',
    date: '2025-01-16T13:30:00',
    method: 'payin Card',
  },
  {
    id: 'fr003',
    userId: '3',
    userName: 'Michael Brown',
    amount: 750.00,
    status: 'rejected',
    date: '2025-01-17T15:45:00',
    method: 'PayPal',
  },
];

// Mock Payouts
export const mockPayouts: Payout[] = [
  {
    id: 'po001',
    userId: '3',
    userName: 'Regular User',
    amount: 100.00,
    fee: 1.00,
    status: 'Successful',
    date: '2025-01-15T14:30:00',
    method: 'Bank Transfer',
  },
  {
    id: 'po002',
    userId: '3',
    userName: 'Emily Johnson',
    amount: 75.00,
    fee: 0.75,
    status: 'pending',
    date: '2025-01-16T16:00:00',
    method: 'PayPal',
  },
  {
    id: 'po003',
    userId: '3',
    userName: 'Michael Brown',
    amount: 50.00,
    fee: 0.50,
    status: 'failed',
    date: '2025-01-17T17:30:00',
    method: 'Bank Transfer',
  },
];

// Mock Chargeback Records
export const mockChargebacks: ChargebackRecord[] = [
  {
    id: 'cb001',
    transactionId: 'txn001',
    userId: '3',
    userName: 'John Smith',
    amount: 250.50,
    status: 'pending',
    reason: 'Item not received',
    date: '2025-01-18T10:00:00',
  },
  {
    id: 'cb002',
    transactionId: 'txn004',
    userId: '3',
    userName: 'Sarah Wilson',
    amount: 100.00,
    status: 'resolved',
    reason: 'Unauthorized transaction',
    date: '2025-01-19T11:30:00',
  },
];

// Mock Wallet Records
export const mockWalletRecords: WalletRecord[] = [
  {
    id: 'wr001',
    userId: '3',
    userName: 'Regular User',
    amount: 500.00,
    balance: 500.00,
    type: 'Payin',
    description: 'Deposit',
    date: '2025-01-15T12:00:00',
    orderId: 'ORD001',
    openBalance: 0.00,
    status: 'Successful'
  },
  {
    id: 'wr002',
    userId: '3',
    userName: 'Regular User',
    amount: 100.00,
    balance: 400.00,
    type: 'Payout',
    description: 'Payout',
    date: '2025-01-16T13:00:00',
    orderId: 'ORD002',
    openBalance: 500.00,
    status: 'Successful'
  },
  {
    id: 'wr003',
    userId: '3',
    userName: 'Emily Johnson',
    amount: 250.00,
    balance: 250.00,
    type: 'Payin',
    description: 'Deposit',
    date: '2025-01-17T14:00:00',
    orderId: 'ORD003',
    openBalance: 0.00,
    status: 'Successful'
  },
];

// Mock Summary Cards Data
export const mockSummaryCardsData: SummaryCardData[] = [
  {
    title: 'Total Users',
    value: '28',
    percentage: 12,
    trend: 'up',
    icon: 'Users',
    color: 'primary',
  },
  {
    title: 'Available Balance',
    value: '17,041,147.47',
    percentage: 3.2,
    trend: 'up',
    icon: 'Wallet',
    color: 'secondary',
  },
  {
    title: 'Today Payout',
    value: '106.96',
    percentage: 1.5,
    trend: 'down',
    icon: 'ArrowUpRight',
    color: 'accent',
  },
  {
    title: 'Today Profit',
    value: '1.06',
    percentage: 0.8,
    trend: 'up',
    icon: 'TrendingUp',
    color: 'success',
  },
  {
    title: 'Total Profit',
    value: '24.66',
    percentage: 5.3,
    trend: 'up',
    icon: 'DollarSign',
    color: 'warning',
  },
  {
    title: 'Total Payout',
    value: '554.16',
    percentage: 2.1,
    trend: 'up',
    icon: 'CreditCard',
    color: 'error',
  },
];

// Menu Items
export const adminMenuItems: MenuItem[] = [
  { title: 'Dashboard', path: '/admin', icon: 'BarChart3' },
  { title: 'Manage User', path: '/admin/manage-user', icon: 'Users' },
  { title: 'Manage Staff', path: '/admin/manage-staff', icon: 'UserCog' },
  { title: 'Manage Payout', path: '/admin/manage-payout', icon: 'ArrowUpRight' },
  { title: 'Bulk Payout', path: '/admin/bulk-payout', icon: 'Layers' },
  { title: 'Wallet Report', path: '/admin/wallet-report', icon: 'Wallet' },
  { title: 'Payin Report', path: '/admin/payin-report', icon: 'PayinIcon' },
  { title: 'Payout Report', path: '/admin/payout-report', icon: 'FileText' },
  { title: 'ChargeBack', path: '/admin/chargeback', icon: 'RotateCcw' },
  { title: 'ChargeBack Report', path: '/admin/chargeback-report', icon: 'FileText' },
  { title: 'Manage Fund Request', path: '/admin/manage-fund-request', icon: 'DollarSign' },
  { title: 'Settlement', path: '/admin/settlement', icon: 'Calendar' },
];

export const userMenuItems: MenuItem[] = [
  { title: 'Dashboard', path: '/user', icon: 'BarChart3' },
  { title: 'Fund Request', path: '/user/fund-request', icon: 'DollarSign' },
  { title: 'Wallet Report', path: '/user/wallet-report', icon: 'Wallet' },
  { title: 'Payin Report', path: '/user/payin-report', icon: 'PayinIcon' },
  { title: 'Payout Report', path: '/user/payout-report', icon: 'FileText' },
  { title: 'Developer Settings', path: '/user/developer-settings', icon: 'Settings' },
  { title: 'Development Docs', path: '/user/development-docs', icon: 'FileCode' },
];

export const agentMenuItems: MenuItem[] = [
  { title: 'Dashboard', path: '/agent', icon: 'BarChart3' },
  { title: 'Fund Request', path: '/agent/fund-request', icon: 'DollarSign' },
  { title: 'Wallet Report', path: '/agent/wallet-report', icon: 'Wallet' },
  { title: 'Payin Report', path: '/agent/payin-report', icon: 'PayinIcon' },
  { title: 'Payout Report', path: '/agent/payout-report', icon: 'FileText' },
  { title: 'Developer Settings', path: '/agent/developer-settings', icon: 'Settings' },
  { title: 'Development Docs', path: '/agent/development-docs', icon: 'FileCode' },
];

// Function to get icon component by name
export const getIconByName = (iconName: string) => {
  const icons = {
    Users,
    Wallet,
    Calendar,
    TrendingUp,
    ArrowUpRight,
    CreditCard,
    BarChart3,
    UserCog,
    RotateCcw,
    Settings,
    FileCode,
    HelpCircle,
    Layers,
    DollarSign,
    FileText,
    PayinIcon
  };
  
  return icons[iconName as keyof typeof icons] || Users;
};