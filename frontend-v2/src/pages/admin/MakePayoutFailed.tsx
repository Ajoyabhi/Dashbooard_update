import { useState } from 'react'
import { Button, TextField } from '@mui/material'
import { AlertTriangle } from 'lucide-react'
import api from '@/utils/axios'
import toast from 'react-hot-toast'

export default function MakePayoutFailed() {
  const [orderId, setOrderId] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!orderId) return toast.error('Order ID is required')
    setSubmitting(true)
    try {
      await api.post('/admin/make-payout-failed', { order_id: orderId, reason })
      toast.success('Payout marked as failed')
      setOrderId('')
      setReason('')
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update payout')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="max-w-lg space-y-5 animate-fade-in">
      <div className="page-header"><h1 className="page-title">Make Payout Failed</h1><p className="page-subtitle">Manually mark a payout transaction as failed</p></div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">This action cannot be undone. The payout will be marked as failed and the amount will be reversed.</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <TextField fullWidth label="Order ID *" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Enter payout order ID" />
        <TextField fullWidth label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for failure" multiline rows={3} />
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}
          sx={{ bgcolor: '#DC2626', borderRadius: 2, '&:hover': { bgcolor: '#B91C1C' } }}>
          {submitting ? 'Processing...' : 'Mark as Failed'}
        </Button>
      </div>
    </div>
  )
}
