import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TextField, Button, Select, MenuItem, FormControl, InputLabel, InputAdornment, IconButton } from '@mui/material'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import api from '@/utils/axios'
import toast from 'react-hot-toast'

interface FormState {
  name: string; user_name: string; email: string; mobile: string; password: string
  user_type: string; company_name: string; gst_no: string; business_type: string
  pan_card: string; aadhar_card: string; address: string; city: string; state: string; pin_code: string
}

const INIT: FormState = {
  name: '', user_name: '', email: '', mobile: '', password: '',
  user_type: 'user', company_name: '', gst_no: '', business_type: '',
  pan_card: '', aadhar_card: '', address: '', city: '', state: '', pin_code: '',
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
      <span className="w-1 h-4 bg-[#1A2744] rounded-full" />{title}
    </h3>
  )
}

export default function AddUser() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [form, setForm] = useState<FormState>(INIT)

  const set = (key: keyof FormState, val: string) => setForm((p) => ({ ...p, [key]: val }))

  const handleSubmit = async () => {
    if (!form.name || !form.user_name || !form.password) {
      return toast.error('Name, username and password are required')
    }
    setSaving(true)
    try {
      await api.post('/admin/users/register', form)
      toast.success('User created successfully')
      navigate('/admin/manage-user')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data
      toast.error(msg?.error || msg?.message || 'Failed to create user')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all">
          <ArrowLeft size={16} />
        </button>
        <div className="page-header mb-0">
          <h1 className="page-title">Add New User</h1>
          <p className="page-subtitle">Create a new merchant account</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-8">

        {/* Account Details */}
        <div>
          <SectionHeader title="Account Details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField fullWidth label="Full Name *" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <TextField fullWidth label="Username *" value={form.user_name} onChange={(e) => set('user_name', e.target.value)} />
            <TextField fullWidth label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <TextField fullWidth label="Mobile *" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
            <TextField
              fullWidth label="Password *" type={showPwd ? 'text' : 'password'}
              value={form.password} onChange={(e) => set('password', e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? <EyeOff size={15} color="#94A3B8" /> : <Eye size={15} color="#94A3B8" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth>
              <InputLabel>User Type</InputLabel>
              <Select value={form.user_type} label="User Type" onChange={(e) => set('user_type', e.target.value)}>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="agent">Agent</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="payin_payout">Payin Payout</MenuItem>
                <MenuItem value="payout_only">Payout Only</MenuItem>
                <MenuItem value="payin_only">Payin Only</MenuItem>
                <MenuItem value="staff">Staff</MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>

        {/* Business Details */}
        <div>
          <SectionHeader title="Business Details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField fullWidth label="Company Name *" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
            <FormControl fullWidth>
              <InputLabel>Business Type</InputLabel>
              <Select value={form.business_type} label="Business Type" onChange={(e) => set('business_type', e.target.value)}>
                <MenuItem value="">Select Business Type</MenuItem>
                <MenuItem value="pvtltd">Private Limited</MenuItem>
                <MenuItem value="partnership">Partnership</MenuItem>
                <MenuItem value="proprietorship">Proprietorship</MenuItem>
                <MenuItem value="llp">LLP</MenuItem>
                <MenuItem value="public">Public</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="GST No" value={form.gst_no} onChange={(e) => set('gst_no', e.target.value)} />
            <TextField fullWidth label="PAN Card" value={form.pan_card} onChange={(e) => set('pan_card', e.target.value)} />
            <TextField fullWidth label="Aadhar Card" value={form.aadhar_card} onChange={(e) => set('aadhar_card', e.target.value)} />
          </div>
        </div>

        {/* Address */}
        <div>
          <SectionHeader title="Address Information" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <TextField fullWidth multiline rows={3} label="Address *" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <TextField fullWidth label="City *" value={form.city} onChange={(e) => set('city', e.target.value)} />
            <TextField fullWidth label="State *" value={form.state} onChange={(e) => set('state', e.target.value)} />
            <TextField fullWidth label="PIN Code *" value={form.pin_code} onChange={(e) => set('pin_code', e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <Button variant="contained" onClick={handleSubmit} disabled={saving}
            sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>
            {saving ? 'Creating...' : 'Create User'}
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)}
            sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
