import { useState, useEffect, useCallback } from 'react'
import { Button, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import api from '@/utils/axios'
import { formatCurrency, formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface FundReq {
  id: string; user_name: string; amount: number; status: string; remarks: string; created_at: string; [key: string]: unknown
}

export default function ManageFundRequest() {
  const [rows, setRows] = useState<FundReq[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FundReq | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/manage-fund-request')
      const d = res.data?.data
      setRows(d?.fundRequests ?? (Array.isArray(d) ? d : []))
    } catch { toast.error('Failed to load fund requests') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleAction = async () => {
    if (!selected || !action) return
    setSubmitting(true)
    try {
      await api.post(`/admin/fund-request/${selected.id}/${action}`, { remarks })
      toast.success(`Fund request ${action}d`)
      setSelected(null); setAction(null); setRemarks(''); fetch()
    } catch { toast.error(`Failed to ${action}`) }
    finally { setSubmitting(false) }
  }

  const columns: Column<FundReq>[] = [
    { key: 'user_name', label: 'User' },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-bold">{formatCurrency(r.amount)}</span> },
    { key: 'status', label: 'Status' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'created_at', label: 'Requested', render: (r) => <span className="text-xs text-slate-400">{formatDateTime(r.created_at)}</span> },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Fund Requests</h1>
          <p className="page-subtitle">{rows.filter((r) => r.status === 'pending').length} pending</p>
        </div>
        <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={fetch}
          sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Refresh</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        {[{ label: 'Pending', status: 'pending', color: 'warning' as const }, { label: 'Approved', status: 'approved', color: 'success' as const }, { label: 'Rejected', status: 'rejected', color: 'error' as const }].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs text-slate-500">{s.label}</span>
            <Chip label={rows.filter((r) => r.status === s.status).length} size="small" color={s.color}
              sx={{ fontWeight: 600, height: 20, borderRadius: '5px', fontSize: '0.65rem' }} />
          </div>
        ))}
      </div>

      <DataTable columns={columns} rows={rows} loading={loading}
        searchKeys={['user_name', 'status']} emptyMessage="No fund requests"
        actions={(row) => row.status === 'pending' ? (
          <>
            <Tooltip title="Approve"><IconButton size="small" sx={{ color: '#10B981' }} onClick={() => { setSelected(row); setAction('approve') }}><CheckCircle size={16} /></IconButton></Tooltip>
            <Tooltip title="Reject"><IconButton size="small" sx={{ color: '#EF4444' }} onClick={() => { setSelected(row); setAction('reject') }}><XCircle size={16} /></IconButton></Tooltip>
          </>
        ) : null} />

      <Dialog open={!!selected} onClose={() => { setSelected(null); setAction(null) }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}><span className="capitalize font-bold">{action}</span> Fund Request</DialogTitle>
        <DialogContent>
          {selected && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">User</p>
                <p className="font-semibold">{selected.user_name}</p>
                <p className="text-xs text-slate-500 mt-2 mb-1">Amount</p>
                <p className="text-xl font-bold text-emerald-700">{formatCurrency(selected.amount)}</p>
              </div>
              <TextField fullWidth label="Remarks (optional)" multiline rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} size="small" />
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => { setSelected(null); setAction(null) }} sx={{ borderRadius: 2, color: '#64748B' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAction} disabled={submitting}
            sx={{ borderRadius: 2, bgcolor: action === 'approve' ? '#10B981' : '#EF4444', '&:hover': { bgcolor: action === 'approve' ? '#059669' : '#DC2626' } }}>
            {submitting ? 'Processing...' : `Confirm ${action}`}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
