export interface User {
  id: string | number
  name: string
  user_name: string
  email?: string
  user_type: 'admin' | 'agent' | 'user' | 'payin_payout' | ''
  balance?: number
  status?: string
  created_at?: string
}

export interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

export interface Transaction {
  id: string
  amount: number
  status: 'success' | 'pending' | 'failed' | 'processing'
  created_at: string
  updated_at?: string
  order_id?: string
  type?: 'payin' | 'payout'
  [key: string]: unknown
}

export interface FundRequest {
  id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  remarks?: string
  user?: string
}
