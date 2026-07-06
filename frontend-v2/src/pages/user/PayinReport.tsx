import { useState, useEffect, useCallback } from 'react'
import {
  Button, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, CircularProgress,
} from '@mui/material'
import { Download, RefreshCw, Filter, X, Clock, CheckCircle, XCircle } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import api from '@/utils/axios'
import { formatCurrency, formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface PayinRow {
  _id: string; transaction_id: string; reference_id: string; amount: number
  gst_amount: number; platform_fee: number; status: string; remark: string
  createdAt: string
  user: { name: string; email: string; mobile: string }
  charges: { admin_charge: number; agent_charge: number; total_charges: number }
  beneficiary_details: { beneficiary_name: string; account_number?: string; account_ifsc?: string; bank_name?: string }
  gateway_response: { utr?: string; status: string; message: string }
  metadata: { requested_ip: string; callback_received_at?: string }
  [key: string]: unknown
}

interface StatusResult {
  paymentStatus: string; utr?: string; payerVpa?: string; npciTxnId?: string; amount?: number
}

const statusColor = (s: string): 'success' | 'error' | 'warning' | 'default' => {
  if (s === 'success' || s === 'completed') return 'success'
  if (s === 'failed') return 'error'
  if (s === 'pending' || s === 'payin_qr_generated') return 'warning'
  return 'default'
}

const columns: Column<PayinRow>[] = [
  { key: 'reference_id', label: 'Order ID', width: 200, render: (r) => <span className="font-medium text-[#1A2744]">{r.reference_id}</span> },
  { key: 'utr', label: 'UTR', render: (r) => <span className="font-mono text-xs">{r.gateway_response?.utr || '—'}</span> },
  { key: 'merchant', label: 'Merchant', render: (r) => <span>{r.user?.name}</span> },
  { key: 'beneficiary', label: 'Beneficiary', render: (r) => <span>{r.beneficiary_details?.beneficiary_name}</span> },
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-semibold">{formatCurrency(r.amount)}</span> },
  { key: 'charge', label: 'Charge', align: 'right', render: (r) => <span className="text-slate-500 text-xs">{formatCurrency(r.charges?.admin_charge ?? 0)}</span> },
  { key: 'gst', label: 'GST', align: 'right', render: (r) => <span className="text-slate-500 text-xs">{formatCurrency(r.gst_amount ?? 0)}</span> },
  { key: 'platform_fee', label: 'Platform Fee', align: 'right', render: (r) => <span className="text-slate-500 text-xs">{formatCurrency(r.platform_fee ?? 0)}</span> },
  {
    key: 'net', label: 'Net Amount', align: 'right',
    render: (r) => <span className="font-semibold text-emerald-700">{formatCurrency(r.amount - (r.charges?.admin_charge ?? 0) - (r.gst_amount ?? 0) - (r.platform_fee ?? 0))}</span>
  },
  {
    key: 'status', label: 'Status',
    render: (r) => <Chip label={r.status} size="small" color={statusColor(r.status)} sx={{ fontSize: '0.65rem', height: 20, borderRadius: '5px' }} />
  },
  {
    key: 'timeline', label: 'Timeline',
    render: (r) => (
      <div className="text-xs space-y-1 min-w-[150px]">
        <div className="flex items-start gap-1.5">
          <Clock size={11} className="text-blue-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-slate-400 uppercase tracking-wide" style={{ fontSize: '9px' }}>Initiated</div>
            <div className="text-slate-600">{formatDateTime(r.createdAt)}</div>
          </div>
        </div>
        <div className="flex items-start gap-1.5">
          {r.metadata?.callback_received_at
            ? <CheckCircle size={11} className="text-emerald-500 mt-0.5 shrink-0" />
            : <XCircle size={11} className="text-slate-300 mt-0.5 shrink-0" />}
          <div>
            <div className="text-slate-400 uppercase tracking-wide" style={{ fontSize: '9px' }}>Callback</div>
            <div className="text-slate-600">
              {r.metadata?.callback_received_at ? formatDateTime(r.metadata.callback_received_at as string) : 'Not sent yet'}
            </div>
          </div>
        </div>
      </div>
    )
  },
]

export default function UserPayinReport() {
  const [rows, setRows] = useState<PayinRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)

  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Check status modal
  const [statusOpen, setStatusOpen] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusResult, setStatusResult] = useState<StatusResult | null>(null)
  const [statusError, setStatusError] = useState('')
  const [checkedRef, setCheckedRef] = useState('')

  const fetch = useCallback(async (p = 0, limit = 10) => {
    setLoading(true)
    try {
      const params: Record<string, string> = {
        page: String(p + 1), limit: String(limit), status,
        ...(search && { search }),
        ...(startDate && { startDate: new Date(startDate).toISOString() }),
        ...(endDate && { endDate: new Date(endDate).toISOString() }),
      }
      const res = await api.get('/user/payin_reports', { params })
      const d = res.data?.data
      setRows(d?.transactions ?? [])
      setTotalItems(d?.pagination?.totalItems ?? 0)
    } catch { toast.error('Failed to load payin transactions') }
    finally { setLoading(false) }
  }, [status, search, startDate, endDate])

  useEffect(() => { setPage(0); fetch(0, pageSize) }, [status, search, startDate, endDate])
  useEffect(() => { fetch(page, pageSize) }, [page, pageSize])

  const resetFilters = () => { setStatus('all'); setSearch(''); setStartDate(''); setEndDate('') }

  const handleDownload = async () => {
    try {
      const params: Record<string, string> = {
        status: status !== 'all' ? status : '',
        ...(search && { search }),
        ...(startDate && { startDate: new Date(startDate).toISOString() }),
        ...(endDate && { endDate: new Date(endDate).toISOString() }),
      }
      const res = await api.get('/user/payin_reports/download', { params, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = 'payin-report.csv'
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url)
    } catch { toast.error('Failed to download report') }
  }

  const checkStatus = async (referenceId: string) => {
    setCheckedRef(referenceId); setStatusOpen(true); setStatusLoading(true)
    setStatusResult(null); setStatusError('')
    try {
      const res = await api.get(`/payments/payin/transaction/${referenceId}`)
      setStatusResult(res.data.transaction)
    } catch (e: unknown) {
      setStatusError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to check status')
    } finally { setStatusLoading(false) }
  }

  const actionCol: Column<PayinRow> = {
    key: '_action', label: 'Actions',
    render: (r) => {
      const canCheck = ['pending', 'failed', 'payin_qr_generated'].includes(r.status)
      if (!canCheck) return <span className="text-slate-300 text-xs">—</span>
      return (
        <button onClick={() => checkStatus(r.reference_id)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 whitespace-nowrap">
          <RefreshCw size={11} /> Check Status
        </button>
      )
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Payin Report</h1>
          <p className="page-subtitle">Incoming payment transactions</p>
        </div>
        <div className="flex gap-2">
          <Button size="small" variant="outlined" startIcon={<Filter size={13} />}
            onClick={() => setShowFilters(!showFilters)}
            sx={{ borderColor: showFilters ? '#1A2744' : '#E2E8F0', color: showFilters ? '#1A2744' : '#64748B', borderRadius: 2 }}>
            Filters
          </Button>
          <Button size="small" variant="outlined" startIcon={<RefreshCw size={13} />}
            onClick={() => fetch(page, pageSize)} sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>
            Refresh
          </Button>
          <Button size="small" variant="contained" startIcon={<Download size={13} />} onClick={handleDownload}
            sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>
            Download
          </Button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Filter Transactions</span>
            <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
              <X size={12} /> Reset
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                {['all', 'completed', 'pending', 'failed', 'payin_qr_generated'].map((s) => (
                  <MenuItem key={s} value={s}>{s === 'all' ? 'All Status' : s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" label="Search" placeholder="Order ID, UTR..." value={search} onChange={(e) => setSearch(e.target.value)} fullWidth />
            <TextField size="small" label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField size="small" label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Total Records', value: totalItems.toLocaleString() },
          { label: 'Successful', value: rows.filter((r) => r.status === 'success' || r.status === 'completed').length, color: 'text-emerald-700' },
          { label: 'Pending', value: rows.filter((r) => r.status === 'pending' || r.status === 'payin_qr_generated').length, color: 'text-amber-600' },
          { label: 'Failed', value: rows.filter((r) => r.status === 'failed').length, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs text-slate-500">{s.label}</span>
            <span className={`font-bold ${s.color ?? 'text-slate-800'}`}>{s.value}</span>
          </div>
        ))}
      </div>

      <DataTable
        columns={[...columns, actionCol]}
        rows={rows} loading={loading}
        searchable={false}
        emptyMessage="No payin transactions found"
        serverPagination={{ total: totalItems, page, pageSize, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(0) } }} />

      {/* Check Status Modal */}
      <Dialog open={statusOpen} onClose={() => setStatusOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Payment Status</DialogTitle>
        <DialogContent>
          <p className="text-xs text-slate-500 mb-4">Order ID: <span className="font-mono font-medium text-slate-800">{checkedRef}</span></p>
          {statusLoading && (
            <div className="flex items-center justify-center py-8 gap-2">
              <CircularProgress size={20} sx={{ color: '#1A2744' }} />
              <span className="text-sm text-slate-500">Checking status...</span>
            </div>
          )}
          {statusError && !statusLoading && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{statusError}</div>
          )}
          {statusResult && !statusLoading && (
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              {[
                { label: 'Payment Status', value: statusResult.paymentStatus },
                statusResult.utr && { label: 'UTR', value: statusResult.utr },
                statusResult.payerVpa && { label: 'Payer VPA', value: statusResult.payerVpa },
                statusResult.npciTxnId && { label: 'NPCI Txn ID', value: statusResult.npciTxnId },
                statusResult.amount && { label: 'Amount', value: formatCurrency(statusResult.amount) },
              ].filter(Boolean).map((row) => {
                const r = row as { label: string; value: string }
                return (
                  <div key={r.label} className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-sm text-slate-500">{r.label}</span>
                    <span className="text-sm font-medium text-slate-800 font-mono">{r.value}</span>
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStatusOpen(false)} sx={{ color: '#64748B', borderRadius: 2 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
