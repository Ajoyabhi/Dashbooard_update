import { useState, useEffect, useCallback } from 'react'
import { Button, Chip, MenuItem, Select, FormControl, InputLabel, TextField } from '@mui/material'
import { Download, RefreshCw, Filter, X } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import api from '@/utils/axios'
import { formatCurrency, formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface FailedRow {
  id: number; reference_id: string; transaction_id: string; transaction_type: string
  amount: number; charges: number; total_amount: number
  wallet_balance_before: number; wallet_balance_after: number
  beneficiary_name: string; beneficiary_account: string; beneficiary_ifsc: string; bank_name: string
  utr_number: string; remark: string; original_status: string; new_status: string
  failed_by: string; created_at: string
  [key: string]: unknown
}

const columns: Column<FailedRow>[] = [
  { key: 'created_at', label: 'Date', render: (r) => <span className="text-xs text-slate-500">{formatDateTime(r.created_at)}</span> },
  { key: 'reference_id', label: 'Reference ID', render: (r) => <span className="font-medium text-[#1A2744]">{r.reference_id}</span> },
  { key: 'beneficiary_name', label: 'Beneficiary' },
  { key: 'beneficiary_account', label: 'Account', render: (r) => <span className="font-mono text-xs">{r.beneficiary_account ? `****${String(r.beneficiary_account).slice(-4)}` : '—'}</span> },
  { key: 'bank_name', label: 'Bank' },
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-semibold">{formatCurrency(r.amount)}</span> },
  { key: 'charges', label: 'Charges', align: 'right', render: (r) => <span className="text-slate-500 text-xs">{formatCurrency(r.charges)}</span> },
  { key: 'total_amount', label: 'Total Amount', align: 'right', render: (r) => <span className="font-semibold text-orange-600">{formatCurrency(r.total_amount)}</span> },
  {
    key: 'wallet', label: 'Wallet Balance', align: 'right',
    render: (r) => (
      <div className="text-xs text-right">
        <span className="text-slate-400">{formatCurrency(r.wallet_balance_before)}</span>
        <span className="text-slate-300 mx-1">→</span>
        <span className="text-emerald-700 font-medium">{formatCurrency(r.wallet_balance_after)}</span>
      </div>
    )
  },
  {
    key: 'new_status', label: 'Status',
    render: (r) => (
      <Chip label={r.new_status} size="small"
        color={r.new_status === 'failed' ? 'error' : r.new_status === 'pending' ? 'warning' : 'default'}
        sx={{ fontSize: '0.65rem', height: 20, borderRadius: '5px' }} />
    )
  },
  { key: 'failed_by', label: 'Failed By', render: (r) => <span className="text-slate-500 text-xs">{r.failed_by || '—'}</span> },
]

export default function PayoutFailedHistory() {
  const [rows, setRows] = useState<FailedRow[]>([])
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
        page: String(p + 1), pageSize: String(limit), status,
        ...(search && { search }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      }
      const res = await api.get('/user/payout_failed_history', { params })
      const d = res.data?.data
      setRows(d?.failedHistory ?? [])
      setTotalItems(d?.pagination?.totalItems ?? 0)
    } catch { toast.error('Failed to load failed history') }
    finally { setLoading(false) }
  }, [status, search, startDate, endDate])

  useEffect(() => { setPage(0); fetch(0, pageSize) }, [status, search, startDate, endDate])
  useEffect(() => { fetch(page, pageSize) }, [page, pageSize])

  const resetFilters = () => { setStatus('all'); setSearch(''); setStartDate(''); setEndDate('') }

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('shrivatsam_token')
      const params = new URLSearchParams({
        status: status !== 'all' ? status : '',
        ...(search && { search }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      })
      const res = await fetch(`${api.defaults.baseURL}/user/payout_failed_history/download?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `payout_failed_history_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url)
      toast.success('Report downloaded')
    } catch { toast.error('Failed to download report') }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Failed Payout History</h1>
          <p className="page-subtitle">Payout transactions that were marked as failed</p>
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
            <span className="text-sm font-semibold text-slate-700">Filter Records</span>
            <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
              <X size={12} /> Reset
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" label="Search" placeholder="Reference ID, beneficiary..." value={search} onChange={(e) => setSearch(e.target.value)} fullWidth />
            <TextField size="small" label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField size="small" label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Total Records', value: totalItems.toLocaleString(), color: 'text-slate-800' },
          { label: 'Failed', value: rows.filter((r) => r.new_status === 'failed').length, color: 'text-red-600' },
          { label: 'Pending', value: rows.filter((r) => r.new_status === 'pending').length, color: 'text-amber-600' },
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
        emptyMessage="No failed payout records found"
        serverPagination={{ total: totalItems, page, pageSize, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(0) } }} />
    </div>
  )
}
