import { useState, useEffect, useCallback } from 'react'
import { Button, Chip, MenuItem, Select, FormControl, InputLabel, TextField } from '@mui/material'
import { Download, RefreshCw, Filter, X } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import api from '@/utils/axios'
import { formatCurrency, formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface PayoutRow {
  _id: string; transaction_id: string; reference_id: string; amount: number
  gst_amount: number; platform_fee: number; status: string; remark: string; createdAt: string
  user: { name: string; email: string; mobile: string }
  charges: { admin_charge: number; agent_charge: number; total_charges: number }
  beneficiary_details: { beneficiary_name: string; account_number: string; account_ifsc: string; bank_name: string }
  gateway_response: { utr?: string; status: string; message: string }
  [key: string]: unknown
}

const statusColor = (s: string): 'success' | 'error' | 'warning' | 'default' => {
  if (s === 'completed') return 'success'
  if (s === 'failed') return 'error'
  if (s === 'processing' || s === 'pending') return 'warning'
  return 'default'
}

const columns: Column<PayoutRow>[] = [
  { key: 'reference_id', label: 'Order ID', width: 200, render: (r) => <span className="font-medium text-[#1A2744]">{r.reference_id}</span> },
  { key: 'merchant', label: 'Merchant', render: (r) => <span>{r.user?.name}</span> },
  { key: 'beneficiary_name', label: 'Beneficiary', render: (r) => <span>{r.beneficiary_details?.beneficiary_name}</span> },
  { key: 'utr', label: 'UTR', render: (r) => <span className="font-mono text-xs">{r.gateway_response?.utr || '—'}</span> },
  { key: 'account_number', label: 'A/C No', render: (r) => <span className="font-mono text-xs">{r.beneficiary_details?.account_number}</span> },
  { key: 'ifsc', label: 'IFSC', render: (r) => <span className="font-mono text-xs">{r.beneficiary_details?.account_ifsc}</span> },
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-semibold">{formatCurrency(r.amount)}</span> },
  { key: 'charge', label: 'Charge', align: 'right', render: (r) => <span className="text-slate-500 text-xs">{formatCurrency(r.charges?.total_charges ?? 0)}</span> },
  { key: 'gst', label: 'GST', align: 'right', render: (r) => <span className="text-slate-500 text-xs">{formatCurrency(r.gst_amount ?? 0)}</span> },
  {
    key: 'net', label: 'Net Amount', align: 'right',
    render: (r) => <span className="font-semibold text-orange-600">{formatCurrency(r.amount + (r.charges?.total_charges ?? 0) + (r.gst_amount ?? 0) + (r.platform_fee ?? 0))}</span>
  },
  {
    key: 'status', label: 'Status',
    render: (r) => <Chip label={r.status} size="small" color={statusColor(r.status)} sx={{ fontSize: '0.65rem', height: 20, borderRadius: '5px' }} />
  },
  { key: 'createdAt', label: 'Date', render: (r) => <span className="text-xs text-slate-500">{formatDateTime(r.createdAt)}</span> },
]

export default function UserPayoutReport() {
  const [rows, setRows] = useState<PayoutRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)

  const [showFilters, setShowFilters] = useState(false)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetch = useCallback(async (p = 0, limit = 10) => {
    setLoading(true)
    try {
      const params: Record<string, string> = {
        page: String(p + 1), limit: String(limit), status,
        ...(search && { search }),
        ...(startDate && { startDate: new Date(startDate).toISOString() }),
        ...(endDate && { endDate: new Date(endDate).toISOString() }),
      }
      const res = await api.get('/user/payout_reports', { params })
      const d = res.data?.data
      setRows(d?.transactions ?? [])
      setTotalItems(d?.pagination?.totalItems ?? 0)
    } catch { toast.error('Failed to load payout transactions') }
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
      const res = await api.get('/user/payout_reports/download', { params, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = 'payout-report.csv'
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url)
    } catch { toast.error('Failed to download report') }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Payout Report</h1>
          <p className="page-subtitle">Outgoing payment transactions</p>
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
                {['all', 'completed', 'pending', 'processing', 'failed'].map((s) => (
                  <MenuItem key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" label="Search" placeholder="Order ID, UTR, A/C..." value={search} onChange={(e) => setSearch(e.target.value)} fullWidth />
            <TextField size="small" label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField size="small" label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Total Records', value: totalItems.toLocaleString(), color: 'text-slate-800' },
          { label: 'Completed', value: rows.filter((r) => r.status === 'completed').length, color: 'text-emerald-700' },
          { label: 'Pending', value: rows.filter((r) => r.status === 'pending' || r.status === 'processing').length, color: 'text-amber-600' },
          { label: 'Failed', value: rows.filter((r) => r.status === 'failed').length, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs text-slate-500">{s.label}</span>
            <span className={`font-bold ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns} rows={rows} loading={loading}
        searchable={false}
        emptyMessage="No payout transactions found"
        serverPagination={{ total: totalItems, page, pageSize, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(0) } }} />
    </div>
  )
}
