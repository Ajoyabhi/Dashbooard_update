import { useState, FormEvent } from 'react'
import { TextField, Button, InputAdornment, IconButton } from '@mui/material'
import { Eye, EyeOff, Lock } from 'lucide-react'
import api from '@/utils/axios'
import toast from 'react-hot-toast'

export default function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (newPwd !== confirm) return toast.error('Passwords do not match')
    if (newPwd.length < 6) return toast.error('Password must be at least 6 characters')
    setSaving(true)
    try {
      await api.post('/user/change-password', { current_password: current, new_password: newPwd })
      toast.success('Password changed successfully')
      setCurrent(''); setNewPwd(''); setConfirm('')
    } catch { toast.error('Failed to change password') }
    finally { setSaving(false) }
  }

  const eyeAdornment = (
    <InputAdornment position="end">
      <IconButton size="small" onClick={() => setShow(!show)}>
        {show ? <EyeOff size={15} color="#94A3B8" /> : <Eye size={15} color="#94A3B8" />}
      </IconButton>
    </InputAdornment>
  )

  return (
    <div className="max-w-md space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Change Password</h1>
        <p className="page-subtitle">Update your account password</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Current Password', value: current, onChange: setCurrent },
            { label: 'New Password', value: newPwd, onChange: setNewPwd },
            { label: 'Confirm New Password', value: confirm, onChange: setConfirm },
          ].map(({ label, value, onChange }) => (
            <TextField key={label} fullWidth label={label} type={show ? 'text' : 'password'}
              value={value} onChange={(e) => onChange(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock size={16} color="#94A3B8" /></InputAdornment>,
                endAdornment: eyeAdornment,
              }} />
          ))}
          <div className="pt-2">
            <Button type="submit" variant="contained" disabled={saving}
              sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>
              {saving ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
