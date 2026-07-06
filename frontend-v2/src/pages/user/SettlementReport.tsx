import { useState, useEffect, useCallback } from 'react'
import { Button, Chip, MenuItem, Select, FormControl, InputLabel, TextField } from '@mui/material'
import { Download, RefreshCw, Filter, X } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import api from '@/utils/axios'
import { formatCurrency, formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface SettRow {
  _id: number; date: string; amount: number
  wallet_balance_before: number; wallet_balance_after: number
  settlement_balance_before: number; settlement_balance_after: number
  status: string; processed_by: string; remark: string; created_at: string
  [key: string]: unknown
}

const columns: Column<SettRow>[] = [
  { key: 'date', label: 'Date', render: (r) => <span className="text-xs text-slate-500">{formatDateTime(r.date || r.created_at)}</span> },
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-semibold text-blue-700">{formatCurrency(r.amount)}</span> },
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
    key: 'settlement', label: 'Settlement Balance', align: 'right',
    render: (r) => (
      <div className="text-xs text-right">
        <span className="text-slate-400">{formatCurrency(r.settlement_balance_before)}</span>
        <span className="text-slate-300 mx-1">→</span>
        <span className="text-blue-700 font-medium">{formatCurrency(r.settlement_balance_after)}</span>
      </div>
    )
  },
  {
    key: 'status', label: 'Status',
    render: (r) => (
      <Chip label={r.status} size="small"
        color={r.status === 'completed' ? 'success' : r.status === 'failed' ? 'error' : 'default'}
        sx={{ fontSize: '0.65rem', height: 20, borderRadius: '5px' }} />
    )
  },
  { key: 'processed_by', label: 'Processed By', render: (r) => <span className="text-slate-600">{r.processed_by || '—'}</span> },
  { key: 'remark', label: 'Remark', render: (r) => <span className="text-slate-500 text-xs">{r.remark || '—'}</span> },
]

export default function UserSettlementReport() {
  const [rows, setRows] = useState<SettRow[]>([])
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
      const res = await api.get('/user/settlement-report', { params })
      const d = res.data?.data
      setRows(d?.transactions ?? [])
      setTotalItems(d?.pagination?.totalItems ?? 0)
    } catch { toast.error('Failed to load settlement report') }
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
      const res = await window.fetch(`${api.defaults.baseURL}/user/settlement-report/download?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `settlement_report_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url)
      toast.success('Report downloaded')
    } catch { toast.error('Failed to download report') }
  }

  const totalSettled = rows.reduce((s, r) => s + (r.amount || 0), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Settlement Report</h1>
          <p className="page-subtitle">Your settlement history</p>
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
            <span className="text-sm font-semibold text-slate-700">Filter Settlements</span>
            <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
              <X size={12} /> Reset
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" label="Search" placeholder="Amount, status, remark..." value={search} onChange={(e) => setSearch(e.target.value)} fullWidth />
            <TextField size="small" label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField size="small" label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Total Records', value: totalItems.toLocaleString(), color: 'text-slate-800' },
          { label: 'Total Settled', value: formatCurrency(totalSettled), color: 'text-blue-700' },
          { label: 'Completed', value: rows.filter((r) => r.status === 'completed').length, color: 'text-emerald-700' },
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
        emptyMessage="No settlement records found"
        serverPagination={{ total: totalItems, page, pageSize, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(0) } }} />
    </div>
  )
}
