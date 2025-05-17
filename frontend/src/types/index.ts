import { DivideIcon as LucideIcon } from 'lucide-react';

export type UserRole = 'admin' | 'agent' | 'user';

export interface User {
  id: number;
  name: string;
  user_name: string;
  email: string;
  mobile: string;
  user_type: UserRole;
  company_name?: string;
  business_type?: string;
  avatar?: string;
  role?: string;
  status?: {
    status: boolean;
    payout_status: boolean;
    api_status: boolean;
    payin_status: boolean;
    payouts_status: boolean;
  };
  merchant_details?: {
    payin_merchant_assigned: string;
    payin_merchant_name: string;
    payout_merchant_assigned: string;
    payout_merchant_name: string;
    user_key: string;
    user_token: string;
    payin_callback: string;
    payout_callback: string;
  };
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
  _id: string;
  transaction_id: string;
  transaction_type: 'credit' | 'debit';
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reference_id: string;
  remark: string;
  metadata: {
    ip_address: string;
    device_info: string;
    location: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    mobile: string;
  };
  charges: {
    admin_charge: number;
    agent_charge: number;
    total_charges: number;
  };
  merchant_details: {
    merchant_name: string;
    merchant_callback_url: string;
  };
  balance: {
    before: number;
    after: number;
  };
  createdAt: string;
  updatedAt: string;
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