import { useState, useEffect, useCallback } from 'react'
import { Button } from '@mui/material'
import { Download, RefreshCw } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import api from '@/utils/axios'
import { formatCurrency, formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface Row { id: string; order_id: string; amount: number; status: string; created_at: string; [key: string]: unknown }

const columns: Column<Row>[] = [
  { key: 'order_id', label: 'Order ID' },
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-semibold text-red-600">{formatCurrency(r.amount)}</span> },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Date', render: (r) => <span className="text-xs text-slate-400">{formatDateTime(r.created_at)}</span> },
]

export default function ChargeBackReport() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/admin/chargeback-report'); setRows(Array.isArray(r.data) ? r.data : r.data?.data || []) }
    catch { toast.error('Failed to load') } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetch() }, [fetch])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="page-header mb-0"><h1 className="page-title">Chargeback Report</h1><p className="page-subtitle">Historical chargeback records</p></div>
        <div className="flex gap-2">
          <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={fetch} sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Refresh</Button>
          <Button size="small" variant="contained" startIcon={<Download size={14} />} sx={{ bgcolor: '#1A2744', borderRadius: 2 }}>Export</Button>
        </div>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} searchKeys={['order_id', 'status']} emptyMessage="No chargeback records" />
    </div>
  )
}
