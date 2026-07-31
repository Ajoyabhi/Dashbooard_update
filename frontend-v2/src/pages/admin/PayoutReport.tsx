import { useState, useEffect, useCallback } from 'react'
import { Button, Chip, IconButton, Tooltip } from '@mui/material'
import { Download, RefreshCw, Send, RotateCw, Activity } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import TransactionTraceModal from '@/components/ui/TransactionTraceModal'
import api from '@/utils/axios'
import { formatCurrency, formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface PayoutRow {
  id: string; transaction_id: string; reference_id: string; utr: string
  amount: number; status: string; user_name: string; user_email: string
  bank_name: string; account_number: string; beneficiary_name: string
  admin_charge: number; createdAt: string; [key: string]: unknown
}

const statusColor = (s: string) => {
  if (s === 'completed') return 'success'
  if (s === 'failed') return 'error'
  if (s === 'processing') return 'warning'
  return 'default'
}

const columns: Column<PayoutRow>[] = [
  { key: 'transaction_id', label: 'Transaction ID', width: 220 },
  { key: 'reference_id', label: 'Reference ID', width: 200 },
  { key: 'user_name', label: 'User' },
  { key: 'beneficiary_name', label: 'Beneficiary' },
  { key: 'bank_name', label: 'Bank' },
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-semibold">{formatCurrency(r.amount)}</span> },
  { key: 'utr', label: 'UTR' },
  { key: 'status', label: 'Status', render: (r) => <Chip label={r.status} size="small" color={statusColor(r.status) as 'success' | 'error' | 'warning' | 'default'} sx={{ fontSize: '0.65rem', height: 20, borderRadius: '5px' }} /> },
  { key: 'createdAt', label: 'Date', render: (r) => <span className="text-slate-500 text-xs">{formatDateTime(r.createdAt as string)}</span> },
]

export default function AdminPayoutReport() {
  const [rows, setRows] = useState<PayoutRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [traceRef, setTraceRef] = useState<string | null>(null)
  const [checkResults, setCheckResults] = useState<Record<string, { live_status: string; mapped_status: string; differs: boolean }>>({})

  const errMsg = (err: unknown) => (err as { response?: { data?: { message?: string } } })?.response?.data?.message

  const handleResend = async (referenceId: string) => {
    if (!window.confirm(`Resend the payout callback for ${referenceId}?`)) return
    setResendingId(referenceId)
    try {
      const res = await api.post(`/admin/payout/${referenceId}/resend-webhook`)
      toast.success(res.data?.message || 'Webhook resent successfully')
    } catch (err) {
      toast.error(errMsg(err) || 'Failed to resend webhook')
    } finally {
      setResendingId(null)
    }
  }

  const handleCheckStatus = async (referenceId: string) => {
    setCheckingId(referenceId)
    try {
      const res = await api.get(`/admin/payout-transactions/${referenceId}/check-status`)
      const { live_status, mapped_status, differs } = res.data
      setCheckResults((prev) => ({ ...prev, [referenceId]: { live_status, mapped_status, differs } }))
      toast.success(`Gateway status: ${live_status}${differs ? ' (differs — can update)' : ''}`)
    } catch (err) {
      toast.error(errMsg(err) || 'Failed to check status')
    } finally {
      setCheckingId(null)
    }
  }

  const handleSyncStatus = async (referenceId: string, mappedStatus: string) => {
    if (!window.confirm(`Update ${referenceId} to "${mappedStatus}"? This will refund on failure and notify the merchant.`)) return
    setSyncingId(referenceId)
    try {
      const res = await api.post(`/admin/payout-transactions/${referenceId}/sync-status`)
      if (res.data?.success) {
        toast.success(res.data?.message || 'Transaction updated')
        setCheckResults((prev) => { const next = { ...prev }; delete next[referenceId]; return next })
        fetch(page, pageSize)
      } else {
        toast.error(res.data?.message || 'Nothing to update')
      }
    } catch (err) {
      toast.error(errMsg(err) || 'Failed to update status')
    } finally {
      setSyncingId(null)
    }
  }

  const fetch = useCallback(async (p = 0, limit = 10) => {
    setLoading(true)
    try {
      const res = await api.get('/admin/payout-transactions', { params: { page: p + 1, pageSize: limit } })
      const d = res.data?.data
      const txns = d?.transactions ?? (Array.isArray(d) ? d : [])
      setTotalItems(d?.pagination?.totalItems ?? txns.length)
      setRows(txns.map((t: Record<string, unknown>) => ({
        ...t,
        id: t._id as string,
        user_name: (t.user as Record<string, unknown>)?.name ?? '',
        user_email: (t.user as Record<string, unknown>)?.email ?? '',
        utr: (t.gateway_response as Record<string, unknown>)?.utr ?? '',
        bank_name: (t.beneficiary_details as Record<string, unknown>)?.bank_name ?? '',
        account_number: (t.beneficiary_details as Record<string, unknown>)?.account_number ?? '',
        beneficiary_name: (t.beneficiary_details as Record<string, unknown>)?.beneficiary_name ?? '',
        admin_charge: (t.charges as Record<string, unknown>)?.admin_charge ?? 0,
      })))
    } catch { toast.error('Failed to load payout report') }
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
          <h1 className="page-title">Payout Report</h1>
          <p className="page-subtitle">All outgoing payment transactions</p>
        </div>
        <div className="flex gap-2">
          <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={() => fetch(page, pageSize)}
            sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Refresh</Button>
          <Button size="small" variant="contained" startIcon={<Download size={14} />}
            sx={{ bgcolor: '#1A2744', borderRadius: 2 }}>Export</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-2.5">
          <span className="text-xs text-slate-500">Total Records</span>
          <span className="font-bold text-slate-800">{totalItems.toLocaleString()}</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-2.5">
          <span className="text-xs text-slate-500">Page Total</span>
          <span className="font-bold text-orange-600">{formatCurrency(total)}</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-2.5">
          <span className="text-xs text-slate-500">Failed</span>
          <Chip label={rows.filter((r) => r.status === 'failed').length} size="small" color="error"
            sx={{ fontWeight: 600, height: 20, borderRadius: '5px', fontSize: '0.65rem' }} />
        </div>
      </div>

      <DataTable
        columns={[...columns,
        { key: '_check', label: 'Check Status', render: (r) => {
          const canCheck = r.status === 'pending' || r.status === 'processing'
          if (!canCheck) return <span className="text-slate-300 text-xs">—</span>
          const checked = checkResults[r.reference_id]
          return (
            <div className="flex flex-col items-start gap-0.5">
              <Tooltip title="Check live gateway status">
                <span>
                  <IconButton size="small" disabled={checkingId === r.reference_id}
                    onClick={() => handleCheckStatus(r.reference_id)} sx={{ color: '#2563EB' }}>
                    <RefreshCw size={15} className={checkingId === r.reference_id ? 'animate-spin' : ''} />
                  </IconButton>
                </span>
              </Tooltip>
              {checked && (
                <span className={`text-[0.65rem] font-medium ${checked.differs ? 'text-amber-600' : 'text-green-600'}`}>
                  {checked.live_status}
                </span>
              )}
            </div>
          )
        }},
        { key: '_sync', label: 'Sync', render: (r) => {
          const canCheck = r.status === 'pending' || r.status === 'processing'
          const checked = checkResults[r.reference_id]
          if (!canCheck || !checked) return <span className="text-slate-300 text-xs">—</span>
          if (!checked.differs) return <span className="text-green-600 text-xs">In sync</span>
          return (
            <Tooltip title={`Update to ${checked.mapped_status}`}>
              <span>
                <IconButton size="small" disabled={syncingId === r.reference_id}
                  onClick={() => handleSyncStatus(r.reference_id, checked.mapped_status)} sx={{ color: '#D97706' }}>
                  <RotateCw size={15} className={syncingId === r.reference_id ? 'animate-spin' : ''} />
                </IconButton>
              </span>
            </Tooltip>
          )
        }},
        { key: '_actions', label: 'Actions', render: (r) => (
          <div className="flex items-center gap-1">
            <Tooltip title="Journey"><IconButton size="small" onClick={() => setTraceRef(r.reference_id)} sx={{ color: '#475569' }}><Activity size={15} /></IconButton></Tooltip>
            {(r.status === 'completed' || r.status === 'failed') && (
              <Tooltip title="Resend Webhook">
                <span>
                  <IconButton size="small" disabled={resendingId === r.reference_id}
                    onClick={() => handleResend(r.reference_id)} sx={{ color: '#4F46E5' }}>
                    <Send size={15} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </div>
        )}]}
        rows={rows} loading={loading}
        searchKeys={['transaction_id', 'reference_id', 'utr', 'user_name', 'beneficiary_name', 'status']}
        emptyMessage="No payout transactions found"
        serverPagination={{ total: totalItems, page, pageSize, onPageChange: handlePageChange, onPageSizeChange: handlePageSizeChange }} />

      <TransactionTraceModal referenceId={traceRef} open={!!traceRef} onClose={() => setTraceRef(null)} />
    </div>
  )
}
