import { useState, useEffect, useCallback } from 'react'
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from '@mui/material'
import { Plus } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import api from '@/utils/axios'
import { formatCurrency, formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface FundReq {
  id: string; amount: number; status: string; remarks: string
  referenceId: string; fromBank: string; toBank: string; paymentType: string
  walletBalance: number; createdAt: string; [key: string]: unknown
}

const columns: Column<FundReq>[] = [
  { key: 'referenceId', label: 'Reference ID' },
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-bold text-emerald-700">{formatCurrency(r.amount)}</span> },
  { key: 'walletBalance', label: 'Wallet Balance', align: 'right', render: (r) => <span className="text-slate-600">{formatCurrency(r.walletBalance)}</span> },
  { key: 'paymentType', label: 'Type' },
  { key: 'fromBank', label: 'From Bank' },
  { key: 'status', label: 'Status' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'createdAt', label: 'Requested At', render: (r) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt as string)}</span> },
]

export default function UserFundRequest() {
  const [rows, setRows] = useState<FundReq[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/user/fund-requests')
      const d = res.data?.data ?? res.data
      setRows(d?.fundRequests ?? (Array.isArray(d) ? d : []))
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount))) return toast.error('Enter a valid amount')
    setSubmitting(true)
    try {
      await api.post('/user/fund-request', { amount: Number(amount), remarks })
      toast.success('Fund request submitted')
      setOpen(false); setAmount(''); setRemarks(''); fetch()
    } catch { toast.error('Failed to submit') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Fund Requests</h1>
          <p className="page-subtitle">Request funds from admin</p>
        </div>
        <Button variant="contained" startIcon={<Plus size={15} />} onClick={() => setOpen(true)}
          sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>
          New Request
        </Button>
      </div>

      <div className="flex gap-3">
        {[{ label: 'Total', val: rows.length }, { label: 'Pending', val: rows.filter((r) => r.status === 'pending').length }, { label: 'Approved', val: rows.filter((r) => r.status === 'approved').length }].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs text-slate-500">{s.label}</span>
            <Chip label={s.val} size="small" sx={{ fontWeight: 600, height: 20, borderRadius: '5px', fontSize: '0.65rem' }} />
          </div>
        ))}
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} searchKeys={['status', 'remarks']} emptyMessage="No fund requests yet" />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>New Fund Request</DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-1">
            <TextField fullWidth label="Amount (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus inputProps={{ min: 1 }} />
            <TextField fullWidth label="Remarks (optional)" multiline rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: '#64748B', borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}
            sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
