import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TextField, Button, Select, MenuItem, FormControl, InputLabel, InputAdornment, IconButton } from '@mui/material'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import api from '@/utils/axios'
import toast from 'react-hot-toast'

export default function AddUser() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [form, setForm] = useState({
    name: '', user_name: '', email: '', mobile: '', password: '',
    user_type: 'user', company_name: '', business_type: '',
  })

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }))

  const handleSubmit = async () => {
    if (!form.name || !form.user_name || !form.password) return toast.error('Name, username and password are required')
    setSaving(true)
    try {
      await api.post('/admin/users', form)
      toast.success('User created successfully')
      navigate('/admin/manage-user')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to create user')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all">
          <ArrowLeft size={16} />
        </button>
        <div className="page-header mb-0">
          <h1 className="page-title">Add New User</h1>
          <p className="page-subtitle">Create a new merchant account</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#1A2744] rounded-full" />Account Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField fullWidth label="Full Name *" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <TextField fullWidth label="Username *" value={form.user_name} onChange={(e) => set('user_name', e.target.value)} />
            <TextField fullWidth label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <TextField fullWidth label="Mobile" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
            <TextField
              fullWidth label="Password *" type={showPwd ? 'text' : 'password'}
              value={form.password} onChange={(e) => set('password', e.target.value)}
              InputProps={{ endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? <EyeOff size={15} color="#94A3B8" /> : <Eye size={15} color="#94A3B8" />}
                  </IconButton>
                </InputAdornment>
              )}}
            />
            <FormControl fullWidth>
              <InputLabel>User Type</InputLabel>
              <Select value={form.user_type} label="User Type" onChange={(e) => set('user_type', e.target.value)}>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="agent">Agent</MenuItem>
                <MenuItem value="payin_payout">Payin Payout</MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#1A2744] rounded-full" />Business Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField fullWidth label="Company Name" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
            <TextField fullWidth label="Business Type" value={form.business_type} onChange={(e) => set('business_type', e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="contained" onClick={handleSubmit} disabled={saving}
            sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>
            {saving ? 'Creating...' : 'Create User'}
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)} sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
