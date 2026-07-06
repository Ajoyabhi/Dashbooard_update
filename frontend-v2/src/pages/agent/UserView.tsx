import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Chip, Skeleton, Divider } from '@mui/material'
import { ArrowLeft, FileText, Phone as PhoneIcon } from 'lucide-react'
import api from '@/utils/axios'
import { formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface UserStatus { status: boolean; payin_status: boolean; payout_status: boolean }
interface UserData {
  id: number; name: string; user_name: string; email: string; mobile: string
  user_type: string; company_name: string; business_type: string
  created_at: string; updated_at: string; UserStatus: UserStatus
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value || <span className="text-slate-300">—</span>}</p>
    </div>
  )
}

export default function AgentUserView() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/agent/users/${userId}`)
      .then((r) => setUser(r.data))
      .catch((e) => toast.error(e.response?.data?.error || 'Failed to load user'))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="space-y-4"><Skeleton height={40} width={200} /><div className="bg-white rounded-2xl border border-slate-200 p-6"><Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} /></div></div>
  if (!user) return <div className="flex items-center justify-center h-64"><p className="text-slate-400">User not found</p></div>

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all"><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title mb-0">{user.name}</h1>
            <p className="text-sm text-slate-400">@{user.user_name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="small" variant="outlined" startIcon={<PhoneIcon size={14} />}
            onClick={() => navigate(`/agent/users/${userId}/charges`)}
            sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Charges</Button>
          <Button size="small" variant="outlined" startIcon={<FileText size={14} />}
            onClick={() => navigate(`/agent/users/${userId}/callbacks`)}
            sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Callbacks</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-7">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><span className="w-1 h-4 bg-[#1A2744] rounded-full" />Basic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <InfoRow label="Full Name" value={user.name} />
            <InfoRow label="Username" value={`@${user.user_name}`} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Mobile" value={user.mobile} />
            <InfoRow label="Company" value={user.company_name} />
            <InfoRow label="Business Type" value={user.business_type} />
          </div>
        </div>
        <Divider sx={{ borderColor: '#F1F5F9' }} />
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><span className="w-1 h-4 bg-[#1A2744] rounded-full" />Account Status</h3>
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'Account', active: user.UserStatus?.status },
              { label: 'Payin', active: user.UserStatus?.payin_status, on: 'Enabled', off: 'Disabled' },
              { label: 'Payout', active: user.UserStatus?.payout_status, on: 'Enabled', off: 'Disabled' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">{s.label}</span>
                <Chip label={s.active ? (s.on || 'Active') : (s.off || 'Inactive')} size="small" color={s.active ? 'success' : 'error'}
                  sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22, borderRadius: '6px' }} />
              </div>
            ))}
          </div>
        </div>
        <Divider sx={{ borderColor: '#F1F5F9' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InfoRow label="Created At" value={formatDateTime(user.created_at)} />
          <InfoRow label="Updated At" value={formatDateTime(user.updated_at)} />
        </div>
      </div>
    </div>
  )
}
