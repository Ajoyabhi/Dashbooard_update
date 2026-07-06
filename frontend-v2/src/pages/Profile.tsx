import { useState } from 'react'
import { TextField, Button, Avatar } from '@mui/material'
import { Save } from 'lucide-react'
import api from '@/utils/axios'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/user/profile', { name, email })
      toast.success('Profile updated')
    } catch { toast.error('Failed to update') }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-xl space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your personal information</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <Avatar sx={{ width: 56, height: 56, bgcolor: '#1A2744', fontSize: '1.25rem', fontWeight: 700 }}>
            {(user?.name || user?.user_name || 'U').charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <p className="font-semibold text-slate-800">{user?.name || user?.user_name}</p>
            <p className="text-sm text-slate-400 capitalize">{user?.user_type} Account</p>
          </div>
        </div>
        <div className="space-y-4">
          <TextField fullWidth label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField fullWidth label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField fullWidth label="Username" value={user?.user_name || ''} disabled helperText="Username cannot be changed" />
          <TextField fullWidth label="Account Type" value={user?.user_type || ''} disabled />
        </div>
        <div className="mt-5">
          <Button variant="contained" startIcon={<Save size={15} />} onClick={handleSave} disabled={saving}
            sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
