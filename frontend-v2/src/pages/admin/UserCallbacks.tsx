import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TextField, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material'
import { ArrowLeft, Save } from 'lucide-react'
import api from '@/utils/axios'
import toast from 'react-hot-toast'

const PAYIN_MERCHANTS = ['Unpay', 'Spay', 'SpayIcici', 'HDFC', 'AirPay', 'Razorpay', 'Philpay']
const PAYOUT_MERCHANTS = ['Unpay', 'Spay', 'Philpay', 'Xlitepay', 'BluSwap']

export default function UserCallbacks() {
  const { userId } = useParams()
  const navigate = useNavigate()

  const [current, setCurrent] = useState({ payinUrl: '', payoutUrl: '', payinMerchant: '', payoutMerchant: '' })
  const [payinUrl, setPayinUrl] = useState('')
  const [payinMerchant, setPayinMerchant] = useState('')
  const [payoutUrl, setPayoutUrl] = useState('')
  const [payoutMerchant, setPayoutMerchant] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingPayin, setSavingPayin] = useState(false)
  const [savingPayout, setSavingPayout] = useState(false)

  useEffect(() => {
    api.get(`/admin/users/${userId}/callback`)
      .then((r) => {
        if (r.data.success) {
          const { payin_callback, payout_callback, payin_merchant_name, payout_merchant_name } = r.data.data
          setCurrent({
            payinUrl: payin_callback || '',
            payoutUrl: payout_callback || '',
            payinMerchant: payin_merchant_name || '',
            payoutMerchant: payout_merchant_name || '',
          })
        }
      })
      .catch(() => toast.error('Failed to load callback settings'))
      .finally(() => setLoading(false))
  }, [userId])

  const handlePayinSave = async () => {
    setSavingPayin(true)
    try {
      const res = await api.post(`/admin/users/${userId}/callback/payin`, {
        payinUrl, payinMerchantName: payinMerchant,
      })
      if (res.data.success) {
        setCurrent((p) => ({ ...p, payinUrl: payinUrl || p.payinUrl, payinMerchant: payinMerchant || p.payinMerchant }))
        setPayinUrl(''); setPayinMerchant('')
        toast.success('Payin callback updated successfully')
      } else {
        toast.error(res.data.message || 'Failed to update')
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update payin callback')
    } finally { setSavingPayin(false) }
  }

  const handlePayoutSave = async () => {
    setSavingPayout(true)
    try {
      const res = await api.post(`/admin/users/${userId}/callback/payout`, {
        payoutUrl, payoutMerchantName: payoutMerchant,
      })
      if (res.data.success) {
        setCurrent((p) => ({ ...p, payoutUrl: payoutUrl || p.payoutUrl, payoutMerchant: payoutMerchant || p.payoutMerchant }))
        setPayoutUrl(''); setPayoutMerchant('')
        toast.success('Payout callback updated successfully')
      } else {
        toast.error(res.data.message || 'Failed to update')
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update payout callback')
    } finally { setSavingPayout(false) }
  }

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all">
          <ArrowLeft size={16} />
        </button>
        <div className="page-header mb-0">
          <h1 className="page-title">Callback Settings</h1>
          <p className="page-subtitle">Configure payin & payout callback URLs and merchants</p>
        </div>
      </div>

      {/* Current settings summary */}
      {!loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#1A2744] rounded-full" />Current Settings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Payin Callback</p>
              <p className="text-sm text-slate-800 break-all">{current.payinUrl || <span className="text-slate-400">Not set</span>}</p>
              <p className="text-xs text-slate-400 mt-0.5">Merchant: {current.payinMerchant || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Payout Callback</p>
              <p className="text-sm text-slate-800 break-all">{current.payoutUrl || <span className="text-slate-400">Not set</span>}</p>
              <p className="text-xs text-slate-400 mt-0.5">Merchant: {current.payoutMerchant || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Update Payin */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />Update Payin Callback
        </h3>
        <div className="space-y-4">
          <TextField
            fullWidth size="small" label="Callback URL"
            placeholder="Enter new payin callback URL"
            value={payinUrl} onChange={(e) => setPayinUrl(e.target.value)}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Merchant Name</InputLabel>
            <Select value={payinMerchant} label="Merchant Name" onChange={(e) => setPayinMerchant(e.target.value)}>
              <MenuItem value="">Select Merchant</MenuItem>
              {PAYIN_MERCHANTS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<Save size={14} />}
            onClick={handlePayinSave} disabled={savingPayin}
            sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>
            {savingPayin ? 'Updating...' : 'Update Payin Callback'}
          </Button>
        </div>
      </div>

      {/* Update Payout */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500" />Update Payout Callback
        </h3>
        <div className="space-y-4">
          <TextField
            fullWidth size="small" label="Callback URL"
            placeholder="Enter new payout callback URL"
            value={payoutUrl} onChange={(e) => setPayoutUrl(e.target.value)}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Merchant Name</InputLabel>
            <Select value={payoutMerchant} label="Merchant Name" onChange={(e) => setPayoutMerchant(e.target.value)}>
              <MenuItem value="">Select Merchant</MenuItem>
              {PAYOUT_MERCHANTS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<Save size={14} />}
            onClick={handlePayoutSave} disabled={savingPayout}
            sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>
            {savingPayout ? 'Updating...' : 'Update Payout Callback'}
          </Button>
        </div>
      </div>

      <Button variant="outlined" onClick={() => navigate(-1)}
        sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>
        Back
      </Button>
    </div>
  )
}
