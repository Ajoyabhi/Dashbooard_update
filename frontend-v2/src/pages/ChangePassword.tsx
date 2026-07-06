import { useState, useEffect, FormEvent } from 'react'
import { TextField, Button, InputAdornment, IconButton } from '@mui/material'
import { Eye, EyeOff, Lock, CheckCircle, XCircle } from 'lucide-react'
import api from '@/utils/axios'
import toast from 'react-hot-toast'

function ValidationItem({ valid, text }: { valid: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {valid ? <CheckCircle size={13} className="text-emerald-500" /> : <XCircle size={13} className="text-red-400" />}
      <span className={valid ? 'text-emerald-600' : 'text-red-500'}>{text}</span>
    </div>
  )
}

export default function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const validation = {
    length: newPwd.length >= 8,
    upper: /[A-Z]/.test(newPwd),
    number: /[0-9]/.test(newPwd),
    match: newPwd === confirm && newPwd !== '',
  }
  const allValid = validation.length && validation.upper && validation.number && validation.match

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!allValid) return toast.error('Please fix the errors before submitting')
    setSaving(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword: current,
        newPassword: newPwd,
      })
      toast.success('Password changed successfully')
      setCurrent(''); setNewPwd(''); setConfirm('')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md space-y-5 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Change Password</h1>
        <p className="page-subtitle">Update your account password</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">

          <TextField
            fullWidth label="Current Password"
            type={showCurrent ? 'text' : 'password'}
            value={current} onChange={(e) => setCurrent(e.target.value)} required
            InputProps={{
              startAdornment: <InputAdornment position="start"><Lock size={16} color="#94A3B8" /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowCurrent(!showCurrent)}>
                    {showCurrent ? <EyeOff size={15} color="#94A3B8" /> : <Eye size={15} color="#94A3B8" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <div className="space-y-2">
            <TextField
              fullWidth label="New Password"
              type={showNew ? 'text' : 'password'}
              value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock size={16} color="#94A3B8" /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowNew(!showNew)}>
                      {showNew ? <EyeOff size={15} color="#94A3B8" /> : <Eye size={15} color="#94A3B8" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {newPwd && (
              <div className="space-y-1 pl-1">
                <ValidationItem valid={validation.length} text="At least 8 characters" />
                <ValidationItem valid={validation.upper} text="Contains an uppercase letter" />
                <ValidationItem valid={validation.number} text="Contains a number" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <TextField
              fullWidth label="Confirm New Password"
              type={showNew ? 'text' : 'password'}
              value={confirm} onChange={(e) => setConfirm(e.target.value)} required
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock size={16} color="#94A3B8" /></InputAdornment>,
              }}
            />
            {confirm && (
              <div className="pl-1">
                <ValidationItem valid={validation.match} text={validation.match ? 'Passwords match' : 'Passwords do not match'} />
              </div>
            )}
          </div>

          <div className="pt-1">
            <Button type="submit" variant="contained" disabled={saving || !allValid}
              sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' }, '&:disabled': { opacity: 0.5 } }}>
              {saving ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
