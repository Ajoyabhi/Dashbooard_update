import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { TextField, Button, CircularProgress } from '@mui/material'
import { Shield, Mail, ArrowLeft } from 'lucide-react'
import api from '@/utils/axios'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) return toast.error('Please enter your email')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      toast.error('Email not found in our system')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#1A2744] flex items-center justify-center">
            <Shield size={22} className="text-[#D4AF37]" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail size={24} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Check your email</h2>
              <p className="text-slate-500 text-sm mb-6">
                We sent a reset link to <strong className="text-slate-700">{email}</strong>
              </p>
              <Link to="/login" className="text-sm text-[#2563EB] font-medium hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Reset password</h2>
              <p className="text-slate-500 text-sm mb-6">Enter your email to receive a reset link</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <TextField fullWidth label="Email address" type="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} autoFocus
                  InputProps={{ startAdornment: <Mail size={16} color="#94A3B8" style={{ marginRight: 8 }} /> }} />
                <Button type="submit" fullWidth variant="contained" disabled={loading}
                  sx={{ bgcolor: '#1A2744', py: 1.4, borderRadius: 2.5, '&:hover': { bgcolor: '#0E172A' } }}>
                  {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Send Reset Link'}
                </Button>
              </form>
              <div className="mt-5 text-center">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                  <ArrowLeft size={14} /> Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
