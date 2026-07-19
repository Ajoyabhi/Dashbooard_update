import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Chip, Skeleton, Divider } from '@mui/material'
import { ArrowLeft, Edit2, Wallet, FileText, Phone as PhoneIcon, ShieldCheck } from 'lucide-react'
import api from '@/utils/axios'
import { formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface UserStatus {
  status: boolean; api_status: boolean; bank_deactive: boolean
  payin_status: boolean; payout_status: boolean; tecnical_issue: boolean
}
interface UserData {
  id: number; name: string; user_name: string; email: string; mobile: string
  user_type: string; company_name: string; business_type: string
  aadhaar_card: string | null; address: string | null; city: string | null
  gst_no: string | null; pancard: string | null; state: string | null; pincode: string | null
  created_at: string; updated_at: string; UserStatus: UserStatus
}

function StatusBadge({ active, labelOn, labelOff }: { active: boolean; labelOn?: string; labelOff?: string }) {
  return (
    <Chip
      label={active ? (labelOn || 'Active') : (labelOff || 'Inactive')}
      size="small"
      color={active ? 'success' : 'error'}
      sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22, borderRadius: '6px' }}
    />
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value || <span className="text-slate-300">—</span>}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-[#1A2744] rounded-full" />{title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{children}</div>
    </div>
  )
}

export default function UserView() {
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

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton height={40} width={200} />
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">User not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title mb-0">{user.name}</h1>
            <p className="text-sm text-slate-400">@{user.user_name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="small" variant="outlined" startIcon={<PhoneIcon size={14} />}
            onClick={() => navigate(`/admin/manage-user/${userId}/charges`)}
            sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Charges</Button>
          <Button size="small" variant="outlined" startIcon={<FileText size={14} />}
            onClick={() => navigate(`/admin/manage-user/${userId}/callbacks`)}
            sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Callbacks</Button>
          <Button size="small" variant="outlined" startIcon={<Wallet size={14} />}
            onClick={() => navigate(`/admin/manage-user/${userId}/add-fund`)}
            sx={{ borderColor: '#10B981', color: '#10B981', borderRadius: 2 }}>Add Fund</Button>
          <Button size="small" variant="outlined" startIcon={<ShieldCheck size={14} />}
            onClick={() => navigate(`/admin/manage-user/${userId}/rolling-reserve`)}
            sx={{ borderColor: '#D97706', color: '#D97706', borderRadius: 2 }}>Rolling Reserve</Button>
          <Button size="small" variant="contained" startIcon={<Edit2 size={14} />}
            onClick={() => navigate(`/admin/manage-user/${userId}/edit`)}
            sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>Edit User</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-7">
        <Section title="Basic Information">
          <InfoRow label="Full Name" value={user.name} />
          <InfoRow label="Username" value={`@${user.user_name}`} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Mobile" value={user.mobile} />
          <InfoRow label="User Type" value={
            <Chip label={user.user_type} size="small" variant="outlined"
              sx={{ fontSize: '0.7rem', fontWeight: 600, borderRadius: '6px', height: 22, borderColor: '#1A2744', color: '#1A2744' }} />
          } />
        </Section>

        <Divider sx={{ borderColor: '#F1F5F9' }} />

        <Section title="Business Information">
          <InfoRow label="Company Name" value={user.company_name} />
          <InfoRow label="Business Type" value={user.business_type} />
          <InfoRow label="GST Number" value={user.gst_no} />
          <InfoRow label="PAN Card" value={user.pancard} />
          <InfoRow label="Aadhaar Card" value={user.aadhaar_card} />
        </Section>

        <Divider sx={{ borderColor: '#F1F5F9' }} />

        <Section title="Address">
          <div className="sm:col-span-2 lg:col-span-3">
            <InfoRow label="Address" value={user.address} />
          </div>
          <InfoRow label="City" value={user.city} />
          <InfoRow label="State" value={user.state} />
          <InfoRow label="Pincode" value={user.pincode} />
        </Section>

        <Divider sx={{ borderColor: '#F1F5F9' }} />

        <Section title="Account Status">
          <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Account</p><StatusBadge active={user.UserStatus?.status} /></div>
          <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Payin</p><StatusBadge active={user.UserStatus?.payin_status} labelOn="Enabled" labelOff="Disabled" /></div>
          <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Payout</p><StatusBadge active={user.UserStatus?.payout_status} labelOn="Enabled" labelOff="Disabled" /></div>
          <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">API</p><StatusBadge active={user.UserStatus?.api_status} /></div>
          <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Bank</p><StatusBadge active={!user.UserStatus?.bank_deactive} labelOn="Active" labelOff="Deactivated" /></div>
          <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Technical Issue</p><StatusBadge active={!user.UserStatus?.tecnical_issue} labelOn="No Issues" labelOff="Has Issues" /></div>
        </Section>

        <Divider sx={{ borderColor: '#F1F5F9' }} />

        <Section title="Timestamps">
          <InfoRow label="Created At" value={formatDateTime(user.created_at)} />
          <InfoRow label="Updated At" value={formatDateTime(user.updated_at)} />
        </Section>
      </div>
    </div>
  )
}
