import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TextField, Button, Skeleton } from '@mui/material'
import { ArrowLeft, Wallet } from 'lucide-react'
import api from '@/utils/axios'
import { formatCurrency } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface UserInfo { name: string; user_name: string; balance?: number }

export default function AddFund() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(`/admin/users/${userId}`)
      .then((r) => setUserInfo({ name: r.data.name, user_name: r.data.user_name, balance: r.data.balance }))
      .catch(() => toast.error('Failed to load user'))
      .finally(() => setLoading(false))
  }, [userId])

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return toast.error('Enter a valid amount')
    setSaving(true)
    try {
      await api.post(`/admin/users/${userId}/add-fund`, { amount: Number(amount), remarks })
      toast.success(`₹${amount} added to ${userInfo?.name}'s wallet`)
      navigate(`/admin/manage-user/${userId}`)
    } catch { toast.error('Failed to add fund') }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-md space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all">
          <ArrowLeft size={16} />
        </button>
        <div className="page-header mb-0">
          <h1 className="page-title">Add Fund</h1>
          <p className="page-subtitle">Credit funds to user wallet</p>
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
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-400">Current Balance</p>
            <p className="font-bold text-emerald-700 text-lg">
              {loading ? <Skeleton width={80} /> : formatCurrency(userInfo?.balance || 0)}
            </p>
          </div>
        </div>

        <TextField
          fullWidth label="Amount (₹)" type="number" value={amount}
          onChange={(e) => setAmount(e.target.value)} autoFocus inputProps={{ min: 1 }}
          InputProps={{ startAdornment: <Wallet size={16} color="#94A3B8" style={{ marginRight: 8 }} /> }}
        />
        <TextField
          fullWidth label="Remarks (optional)" multiline rows={2}
          value={remarks} onChange={(e) => setRemarks(e.target.value)}
        />

        {amount && Number(amount) > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <p className="text-sm text-emerald-800 font-medium">
              New balance will be: <strong>{formatCurrency((userInfo?.balance || 0) + Number(amount))}</strong>
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="contained" onClick={handleSubmit} disabled={saving || loading}
            sx={{ bgcolor: '#10B981', borderRadius: 2, '&:hover': { bgcolor: '#059669' } }}>
            {saving ? 'Adding...' : 'Add Fund'}
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)}
            sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
