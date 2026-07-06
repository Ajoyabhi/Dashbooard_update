import { useState, useEffect } from 'react'
import { Avatar, Chip, Skeleton } from '@mui/material'
import { User, Mail, Phone, Building, Briefcase, Shield, CreditCard, Key, RefreshCw } from 'lucide-react'
import api from '@/utils/axios'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

interface ProfileData {
  id: number
  name: string
  user_name: string
  email: string
  mobile: string
  user_type: string
  company_name?: string
  business_type?: string
  status?: {
    status: boolean
    payout_status: boolean
    api_status: boolean
    payin_status: boolean
  }
  merchant_details?: {
    payin_merchant_name: string
    payout_merchant_name: string
    user_key: string
    user_token: string
    payin_callback: string
    payout_callback: string
  }
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm text-slate-800 font-medium mt-0.5">{value || '—'}</p>
      </div>
    </div>
  )
}

function StatusDot({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-400'}`} />
      <span className="text-xs text-slate-500">{label}</span>
      <Chip
        label={active ? 'Active' : 'Inactive'}
        size="small"
        color={active ? 'success' : 'error'}
        sx={{ fontSize: '0.6rem', height: 18, borderRadius: '4px' }}
      />
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await api.get('/auth/profile')
      const d = res.data?.data ?? res.data
      setProfile(d)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProfile() }, [])

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Your account details</p>
        </div>
        <button onClick={fetchProfile}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 transition-all">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Avatar hero */}
      <div className="bg-gradient-to-r from-[#1A2744] to-[#2D4A8A] rounded-2xl p-6 text-white flex items-center gap-5">
        <Avatar sx={{ width: 64, height: 64, bgcolor: 'rgba(212,175,55,0.25)', border: '2px solid #D4AF37', fontSize: '1.5rem', fontWeight: 700, color: '#D4AF37' }}>
          {(user?.name || user?.user_name || 'U').charAt(0).toUpperCase()}
        </Avatar>
        <div>
          {loading ? <Skeleton width={160} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} /> : <p className="text-xl font-bold">{profile?.name || user?.name || user?.user_name}</p>}
          <p className="text-blue-300 text-sm capitalize mt-0.5">{profile?.user_type || user?.user_type} Account</p>
          {profile?.company_name && <p className="text-blue-200 text-xs mt-0.5">{profile.company_name}</p>}
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-[#1A2744] rounded-full" /> Basic Information
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={48} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoRow icon={<User size={16} />} label="Full Name" value={profile?.name} />
            <InfoRow icon={<Mail size={16} />} label="Email" value={profile?.email} />
            <InfoRow icon={<Phone size={16} />} label="Mobile" value={profile?.mobile} />
            <InfoRow icon={<Shield size={16} />} label="User Type" value={profile?.user_type} />
            <InfoRow icon={<Building size={16} />} label="Company" value={profile?.company_name} />
            <InfoRow icon={<Briefcase size={16} />} label="Business Type" value={profile?.business_type} />
          </div>
        )}
      </div>

      {/* Account Status */}
      {!loading && profile?.status && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#1A2744] rounded-full" /> Account Status
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatusDot active={profile.status.status} label="Account" />
            <StatusDot active={profile.status.payout_status} label="Payout" />
            <StatusDot active={profile.status.api_status} label="API" />
            <StatusDot active={profile.status.payin_status} label="Payin" />
          </div>
        </div>
      )}

      {/* Merchant Details */}
      {!loading && profile?.merchant_details && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#1A2744] rounded-full" /> Merchant Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoRow icon={<CreditCard size={16} />} label="Payin Merchant" value={profile.merchant_details.payin_merchant_name} />
            <InfoRow icon={<CreditCard size={16} />} label="Payout Merchant" value={profile.merchant_details.payout_merchant_name} />
            <InfoRow icon={<Key size={16} />} label="User Key" value={profile.merchant_details.user_key} />
            <InfoRow icon={<Key size={16} />} label="User Token" value={profile.merchant_details.user_token} />
          </div>
        </div>
      )}
    </div>
  )
}
