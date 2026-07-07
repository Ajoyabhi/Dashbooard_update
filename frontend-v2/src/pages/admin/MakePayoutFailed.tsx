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
    // Accept one or many reference IDs (comma / space / newline separated).
    const referenceNumbers = orderId.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
    if (referenceNumbers.length === 0) return toast.error('Order ID is required')
    setSubmitting(true)
    try {
      const res = await api.post('/admin/make-payout-failed', { referenceNumbers, reason })
      const d = res.data?.data
      const modified = d?.modifiedCount ?? 0
      const skipped = d?.skipped?.length ?? 0
      if (modified > 0) {
        toast.success(`Marked ${modified} payout(s) as failed and refunded settlement${skipped ? `, ${skipped} skipped` : ''}`)
        setOrderId('')
        setReason('')
      } else {
        toast.error(skipped ? `No payouts updated (${skipped} skipped — not found or already finalized)` : 'No matching pending payouts found')
      }
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update payout')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="max-w-lg space-y-5 animate-fade-in">
      <div className="page-header"><h1 className="page-title">Make Payout Failed</h1><p className="page-subtitle">Manually mark a payout transaction as failed</p></div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">This action cannot be undone. The payout(s) will be marked as failed, the full amount (including charges, GST &amp; platform fee) refunded to the merchant&apos;s <strong>settlement</strong> balance, and the merchant notified via their payout webhook.</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <TextField fullWidth label="Reference ID(s) *" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="One or more reference IDs (comma or newline separated)" multiline minRows={2} />
        <TextField fullWidth label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for failure" multiline rows={3} />
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}
          sx={{ bgcolor: '#DC2626', borderRadius: 2, '&:hover': { bgcolor: '#B91C1C' } }}>
          {submitting ? 'Processing...' : 'Mark as Failed'}
        </Button>
      </div>
    </div>
  )
}
