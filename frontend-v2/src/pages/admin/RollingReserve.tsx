import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TextField, Button, Skeleton, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { ArrowLeft, Lock, Unlock, ShieldCheck } from 'lucide-react'
import api from '@/utils/axios'
import { formatCurrency } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface UserInfo { name: string; user_name: string }
interface Balances { wallet_balance: number; rolling_reserve_balance: number }

export default function RollingReserve() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [balances, setBalances] = useState<Balances | null>(null)
  const [action, setAction] = useState<'hold' | 'release'>('hold')
  const [amount, setAmount] = useState('')
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchBalances = useCallback(async () => {
    const r = await api.get(`/admin/users/${userId}/rolling-reserve`)
    setBalances(r.data?.data ?? null)
  }, [userId])

  useEffect(() => {
    Promise.all([
      api.get(`/admin/users/${userId}`).then((r) => setUserInfo({ name: r.data.name, user_name: r.data.user_name })),
      fetchBalances(),
    ])
      .catch(() => toast.error('Failed to load user'))
      .finally(() => setLoading(false))
  }, [userId, fetchBalances])

  const walletBalance = balances?.wallet_balance ?? 0
  const reserveBalance = balances?.rolling_reserve_balance ?? 0
  const numAmount = Number(amount)
  const sourceBalance = action === 'hold' ? walletBalance : reserveBalance
  const insufficient = numAmount > 0 && numAmount > sourceBalance

  const handleSubmit = async () => {
    if (!amount || isNaN(numAmount) || numAmount <= 0) return toast.error('Enter a valid amount')
    if (insufficient) return toast.error(action === 'hold' ? 'Insufficient wallet balance' : 'Insufficient rolling reserve balance')
    setSaving(true)
    try {
      await api.post(`/admin/users/${userId}/rolling-reserve`, { amount: numAmount, action, remark })
      toast.success(action === 'hold'
        ? `₹${amount} moved to rolling reserve`
        : `₹${amount} released back to wallet`)
      setAmount(''); setRemark('')
      await fetchBalances()
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } }
      toast.error(err.response?.data?.error || 'Failed to update rolling reserve')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-md space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all">
          <ArrowLeft size={16} />
        </button>
        <div className="page-header mb-0">
          <h1 className="page-title">Rolling Reserve</h1>
          <p className="page-subtitle">Hold or release funds from user wallet</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        {/* User info */}
        <div className="bg-[#1A2744]/5 rounded-xl p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#1A2744] flex items-center justify-center text-white font-bold text-lg">
            {loading ? '?' : (userInfo?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            {loading ? (
              <><Skeleton width={120} /><Skeleton width={80} /></>
            ) : (
              <>
                <p className="font-semibold text-slate-800">{userInfo?.name}</p>
                <p className="text-sm text-slate-400">@{userInfo?.user_name}</p>
              </>
            )}
          </div>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <p className="text-xs text-emerald-700/70 mb-1">Wallet Balance</p>
            <p className="font-bold text-emerald-700 text-lg">
              {loading ? <Skeleton width={80} /> : formatCurrency(walletBalance)}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700/70 mb-1">Rolling Reserve</p>
            <p className="font-bold text-amber-600 text-lg">
              {loading ? <Skeleton width={80} /> : formatCurrency(reserveBalance)}
            </p>
          </div>
        </div>

        <ToggleButtonGroup
          value={action} exclusive fullWidth size="small"
          onChange={(_, v) => { if (v) setAction(v) }}
        >
          <ToggleButton value="hold" sx={{ gap: 1, textTransform: 'none', fontWeight: 600 }}>
            <Lock size={14} /> Hold to Reserve
          </ToggleButton>
          <ToggleButton value="release" sx={{ gap: 1, textTransform: 'none', fontWeight: 600 }}>
            <Unlock size={14} /> Release to Wallet
          </ToggleButton>
        </ToggleButtonGroup>

        <TextField
          fullWidth label="Amount (₹)" type="number" value={amount}
          onChange={(e) => setAmount(e.target.value)} autoFocus inputProps={{ min: 1 }}
          error={insufficient}
          helperText={insufficient ? `Exceeds available ${action === 'hold' ? 'wallet' : 'reserve'} balance` : ''}
          InputProps={{ startAdornment: <ShieldCheck size={16} color="#94A3B8" style={{ marginRight: 8 }} /> }}
        />
        <TextField
          fullWidth label="Remark (optional)" multiline rows={2}
          value={remark} onChange={(e) => setRemark(e.target.value)}
        />

        {numAmount > 0 && !insufficient && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-0.5">
            <p className="text-sm text-amber-800 font-medium">
              Wallet: <strong>{formatCurrency(action === 'hold' ? walletBalance - numAmount : walletBalance + numAmount)}</strong>
            </p>
            <p className="text-sm text-amber-800 font-medium">
              Rolling Reserve: <strong>{formatCurrency(action === 'hold' ? reserveBalance + numAmount : reserveBalance - numAmount)}</strong>
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="contained" onClick={handleSubmit} disabled={saving || loading || insufficient}
            sx={{ bgcolor: action === 'hold' ? '#D97706' : '#10B981', borderRadius: 2, '&:hover': { bgcolor: action === 'hold' ? '#B45309' : '#059669' } }}>
            {saving ? 'Processing...' : action === 'hold' ? 'Hold Amount' : 'Release Amount'}
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)}
            sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
