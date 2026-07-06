import { useState, useEffect, useCallback } from 'react'
import { Button } from '@mui/material'
import { Download, RefreshCw } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import api from '@/utils/axios'
import { formatCurrency, formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface PayoutRow { id: string; order_id: string; utr: string; amount: number; status: string; bank_name: string; account_number: string; created_at: string; [key: string]: unknown }

const columns: Column<PayoutRow>[] = [
  { key: 'order_id', label: 'Order ID' },
  { key: 'utr', label: 'UTR' },
  { key: 'bank_name', label: 'Bank' },
  { key: 'account_number', label: 'Account No.' },
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-semibold">{formatCurrency(r.amount)}</span> },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Date', render: (r) => <span className="text-xs text-slate-400">{formatDateTime(r.created_at)}</span> },
]

export default function UserPayoutReport() {
  const [rows, setRows] = useState<PayoutRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/user/payout_reports')
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
          <h1 className="page-title">Payout Report</h1>
          <p className="page-subtitle">All outgoing payment transactions</p>
        </div>
        <div className="flex gap-2">
          <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={fetch} sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Refresh</Button>
          <Button size="small" variant="contained" startIcon={<Download size={14} />} sx={{ bgcolor: '#1A2744', borderRadius: 2 }}>Export</Button>
        </div>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} searchKeys={['order_id', 'utr', 'bank_name', 'status']} emptyMessage="No payout transactions" />
    </div>
  )
}
