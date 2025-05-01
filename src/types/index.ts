import { DivideIcon as LucideIcon } from 'lucide-react';

export type UserRole = 'admin' | 'agent' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface SummaryCardData {
  title: string;
  value: string | number;
  percentage?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  user: string;
  type: 'payout' | 'deposit' | 'withdrawal' | 'refund';
  method?: string;
}

export interface FundRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  method: string;
}

export interface Payout {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  fee: number;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  method: string;
}

export interface ChargebackRecord {
  id: string;
  transactionId: string;
  userId: string;
  userName: string;
  amount: number;
  status: 'pending' | 'resolved' | 'cancelled';
  reason: string;
  date: string;
}

export interface WalletRecord {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  balance: number;
  type: 'credit' | 'debit';
  description: string;
  date: string;
  orderId: string;
  openBalance: number;
  status: 'Successful' | 'pending' | 'failed';
}

export interface MenuItem {
  title: string;
  path: string;
  icon: string;
  badge?: number;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}