import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TextField, Button, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel, Skeleton } from '@mui/material'
import { ArrowLeft, Save } from 'lucide-react'
import api from '@/utils/axios'
import toast from 'react-hot-toast'

interface FormData {
  name: string; user_name: string; email: string; mobile: string
  user_type: string; company_name: string; business_type: string
  status: string; payin_status: boolean; payout_status: boolean
}

export default function UserEdit() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormData>({
    name: '', user_name: '', email: '', mobile: '', user_type: '',
    company_name: '', business_type: '', status: 'active',
    payin_status: false, payout_status: false,
  })

  useEffect(() => {
    api.get(`/admin/users/${userId}`)
      .then((r) => {
        const u = r.data
        setForm({
          name: u.name || '', user_name: u.user_name || '',
          email: u.email || '', mobile: u.mobile || '',
          user_type: u.user_type || '', company_name: u.company_name || '',
          business_type: u.business_type || '',
          status: u.UserStatus?.status || 'inactive',
          payin_status: u.UserStatus?.payin_status || false,
          payout_status: u.UserStatus?.payout_status || false,
        })
      })
      .catch(() => toast.error('Failed to load user'))
      .finally(() => setLoading(false))
  }, [userId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/admin/users/${userId}`, form)
      toast.success('User updated successfully')
      navigate(`/admin/manage-user/${userId}`)
    } catch { toast.error('Failed to update user') }
    finally { setSaving(false) }
  }

  const set = (key: keyof FormData, val: string | boolean) =>
    setForm((p) => ({ ...p, [key]: val }))

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton height={40} width={200} />
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all">
          <ArrowLeft size={16} />
        </button>
        <div className="page-header mb-0">
          <h1 className="page-title">Edit User</h1>
          <p className="page-subtitle">Update user details and permissions</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        {/* Basic info */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#1A2744] rounded-full" />Basic Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField fullWidth label="Full Name" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <TextField fullWidth label="Username" value={form.user_name} onChange={(e) => set('user_name', e.target.value)} />
            <TextField fullWidth label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <TextField fullWidth label="Mobile" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
            <TextField fullWidth label="Company Name" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
            <TextField fullWidth label="Business Type" value={form.business_type} onChange={(e) => set('business_type', e.target.value)} />
          </div>
        </div>

        {/* User type & status */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#1A2744] rounded-full" />Role & Status
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormControl fullWidth>
              <InputLabel>User Type</InputLabel>
              <Select value={form.user_type} label="User Type" onChange={(e) => set('user_type', e.target.value)}>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="agent">Agent</MenuItem>
                <MenuItem value="payin_payout">Payin Payout</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Account Status</InputLabel>
              <Select value={form.status} label="Account Status" onChange={(e) => set('status', e.target.value)}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div className="flex gap-6 mt-4">
            <FormControlLabel
              control={<Switch checked={form.payin_status} onChange={(e) => set('payin_status', e.target.checked)}
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#10B981' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#10B981' } }} />}
              label={<span className="text-sm font-medium text-slate-700">Payin Enabled</span>}
            />
            <FormControlLabel
              control={<Switch checked={form.payout_status} onChange={(e) => set('payout_status', e.target.checked)}
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#10B981' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#10B981' } }} />}
              label={<span className="text-sm font-medium text-slate-700">Payout Enabled</span>}
            />
          </div>
        </div>

        <div className="pt-2 flex gap-3">
          <Button variant="contained" startIcon={<Save size={15} />} onClick={handleSave} disabled={saving}
            sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)}
            sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
