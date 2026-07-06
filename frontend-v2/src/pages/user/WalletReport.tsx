import { useState, useEffect, useCallback } from 'react'
import { Button } from '@mui/material'
import { Download, RefreshCw } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import api from '@/utils/axios'
import { formatCurrency, formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface WalletRow { id: string; type: string; amount: number; balance_after: number; description: string; created_at: string; [key: string]: unknown }

const columns: Column<WalletRow>[] = [
  { key: 'type', label: 'Type', render: (r) => (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${r.type === 'credit' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
      {String(r.type).toUpperCase()}
    </span>
  )},
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => (
    <span className={`font-semibold ${r.type === 'credit' ? 'text-emerald-700' : 'text-red-600'}`}>
      {r.type === 'credit' ? '+' : '-'}{formatCurrency(r.amount)}
    </span>
  )},
  { key: 'balance_after', label: 'Balance After', align: 'right', render: (r) => <span>{formatCurrency(r.balance_after)}</span> },
  { key: 'description', label: 'Description' },
  { key: 'created_at', label: 'Date', render: (r) => <span className="text-xs text-slate-400">{formatDateTime(r.created_at)}</span> },
]

export default function UserWalletReport() {
  const [rows, setRows] = useState<WalletRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/user/wallet_reports')
      const d = res.data?.data
      setRows(d?.transactions ?? (Array.isArray(d) ? d : []))
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Wallet Report</h1>
          <p className="page-subtitle">Your wallet transaction history</p>
        </div>
        <div className="flex gap-2">
          <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={fetch} sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Refresh</Button>
          <Button size="small" variant="contained" startIcon={<Download size={14} />} sx={{ bgcolor: '#1A2744', borderRadius: 2 }}>Export</Button>
        </div>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} searchKeys={['type', 'description']} emptyMessage="No wallet transactions" />
    </div>
  )
}
