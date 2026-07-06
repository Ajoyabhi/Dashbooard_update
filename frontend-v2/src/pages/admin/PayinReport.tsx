import { useState, useEffect, useCallback } from 'react'
import { Button, Chip, IconButton, Tooltip } from '@mui/material'
import { Download, RefreshCw, Eye } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import api from '@/utils/axios'
import { formatCurrency, formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface PayinRow {
  id: string; transaction_id: string; reference_id: string; utr: string
  amount: number; gst_amount: number; platform_fee: number
  status: string; user_name: string; user_email: string; user_mobile: string
  admin_charge: number; createdAt: string; [key: string]: unknown
}

const statusColor = (s: string) => {
  if (s === 'success') return 'success'
  if (s === 'failed') return 'error'
  return 'default'
}

const columns: Column<PayinRow>[] = [
  { key: 'transaction_id', label: 'Transaction ID', width: 220 },
  { key: 'reference_id', label: 'Reference ID', width: 200 },
  { key: 'user_name', label: 'User' },
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-semibold text-slate-800">{formatCurrency(r.amount)}</span> },
  { key: 'utr', label: 'UTR', width: 200 },
  { key: 'status', label: 'Status', render: (r) => <Chip label={r.status} size="small" color={statusColor(r.status) as 'success' | 'error' | 'default'} sx={{ fontSize: '0.65rem', height: 20, borderRadius: '5px' }} /> },
  { key: 'createdAt', label: 'Date & Time', render: (r) => <span className="text-slate-500 text-xs">{formatDateTime(r.createdAt as string)}</span> },
]

export default function AdminPayinReport() {
  const [rows, setRows] = useState<PayinRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)

  const fetch = useCallback(async (p = 0, limit = 10) => {
    setLoading(true)
    try {
      const res = await api.get('/admin/payin-transactions', { params: { page: p + 1, pageSize: limit } })
      const d = res.data?.data
      const txns = d?.transactions ?? (Array.isArray(d) ? d : [])
      setTotalItems(d?.pagination?.totalItems ?? txns.length)
      setRows(txns.map((t: Record<string, unknown>) => ({
        ...t,
        id: t._id as string,
        user_name: (t.user as Record<string, unknown>)?.name ?? '',
        user_email: (t.user as Record<string, unknown>)?.email ?? '',
        user_mobile: (t.user as Record<string, unknown>)?.mobile ?? '',
        utr: (t.gateway_response as Record<string, unknown>)?.utr ?? '',
        admin_charge: (t.charges as Record<string, unknown>)?.admin_charge ?? 0,
      })))
    } catch { toast.error('Failed to load payin report') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch(page, pageSize) }, [fetch, page, pageSize])

  const handlePageChange = (p: number) => setPage(p)
  const handlePageSizeChange = (size: number) => { setPageSize(size); setPage(0) }

  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Payin Report</h1>
          <p className="page-subtitle">All incoming payment transactions</p>
        </div>
        <div className="flex gap-2">
          <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={() => fetch(page, pageSize)}
            sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Refresh</Button>
          <Button size="small" variant="contained" startIcon={<Download size={14} />}
            sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>Export</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Total Records', value: rows.length, type: 'number' },
          { label: 'Total Amount', value: formatCurrency(total), type: 'currency' },
          { label: 'Successful', value: rows.filter((r) => r.status === 'success').length, type: 'chip-success' },
          { label: 'Failed', value: rows.filter((r) => r.status === 'failed').length, type: 'chip-error' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-2.5">
            <span className="text-xs text-slate-500">{s.label}</span>
            {s.type === 'chip-success' && <Chip label={s.value} size="small" color="success" sx={{ fontWeight: 600, height: 20, borderRadius: '5px', fontSize: '0.65rem' }} />}
            {s.type === 'chip-error' && <Chip label={s.value} size="small" color="error" sx={{ fontWeight: 600, height: 20, borderRadius: '5px', fontSize: '0.65rem' }} />}
            {(s.type === 'number' || s.type === 'currency') && <span className={`font-bold ${s.type === 'currency' ? 'text-emerald-700' : 'text-slate-800'}`}>{s.value}</span>}
          </div>
        ))}
      </div>

      <DataTable
        columns={[...columns, { key: '_view', label: '', render: () => (
          <Tooltip title="View Details"><IconButton size="small" sx={{ color: '#1A2744' }}><Eye size={15} /></IconButton></Tooltip>
        )}]}
        rows={rows} loading={loading}
        searchKeys={['transaction_id', 'reference_id', 'utr', 'user_name', 'status']}
        emptyMessage="No payin transactions found"
        serverPagination={{ total: totalItems, page, pageSize, onPageChange: handlePageChange, onPageSizeChange: handlePageSizeChange }} />
    </div>
  )
}
