import { useState, useEffect, useCallback } from 'react'
import { Button } from '@mui/material'
import { Download, RefreshCw } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import api from '@/utils/axios'
import { formatCurrency, formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface PayinRow { id: string; order_id: string; utr: string; amount: number; status: string; created_at: string; [key: string]: unknown }

const columns: Column<PayinRow>[] = [
  { key: 'order_id', label: 'Order ID' },
  { key: 'utr', label: 'UTR' },
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-semibold text-emerald-700">{formatCurrency(r.amount)}</span> },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Date', render: (r) => <span className="text-xs text-slate-400">{formatDateTime(r.created_at)}</span> },
]

export default function UserPayinReport() {
  const [rows, setRows] = useState<PayinRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/user/payin_reports')
      const d = res.data?.data
      setRows(d?.transactions ?? (Array.isArray(d) ? d : []))
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Payin Report</h1>
          <p className="page-subtitle">Total: <strong className="text-emerald-700">{formatCurrency(total)}</strong> · {rows.length} transactions</p>
        </div>
        <div className="flex gap-2">
          <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={fetch} sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Refresh</Button>
          <Button size="small" variant="contained" startIcon={<Download size={14} />} sx={{ bgcolor: '#1A2744', borderRadius: 2 }}>Export</Button>
        </div>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} searchKeys={['order_id', 'utr', 'status']} emptyMessage="No payin transactions" />
    </div>
  )
}
