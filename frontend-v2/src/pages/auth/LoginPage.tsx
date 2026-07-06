import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import { TextField, Button, InputAdornment, IconButton, CircularProgress } from '@mui/material'
import { Eye, EyeOff, Shield, Lock, User, ArrowRight, CheckCircle } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, user } = useAuth()
  const navigate = useNavigate()

  if (user) {
    const redirect = { admin: '/admin', agent: '/agent', user: '/user', payin_payout: '/user' }
    navigate(redirect[user.user_type as keyof typeof redirect] || '/user', { replace: true })
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username || !password) return toast.error('Please fill all fields')
    setLoading(true)
    try {
      await login(username, password)
      toast.success('Welcome to Shrivatsam!')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const features = ['256-bit SSL Encryption', 'PCI DSS Compliant', 'Real-time Monitoring', 'Multi-role Access']

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#1A2744] flex-col relative overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`, backgroundSize: '32px 32px' }} />
        {/* Glow orbs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#E8C43A] flex items-center justify-center shadow-xl">
              <Shield size={22} className="text-[#1A2744]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Shrivatsam</h1>
              <p className="text-[10px] text-[#D4AF37] font-semibold tracking-[0.2em] uppercase">Payment Gateway</p>
            </div>
          </div>

          {/* Hero text */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <div className="w-16 h-1 bg-[#D4AF37] rounded-full mb-8" />
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Secure. Reliable.<br />
              <span className="text-[#D4AF37]">Banking Grade.</span>
            </h2>
            <p className="text-slate-300 text-base leading-relaxed mb-10">
              Manage your payment operations with enterprise-level security and real-time insights.
              Built for scale, designed for trust.
            </p>

            <div className="space-y-3">
              {features.map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#D4AF37]/20 flex items-center justify-center shrink-0">
                    <CheckCircle size={12} className="text-[#D4AF37]" />
                  </div>
                  <span className="text-sm text-slate-300">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} Shrivatsam Technologies. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-[#1A2744] flex items-center justify-center">
              <Shield size={18} className="text-[#D4AF37]" />
            </div>
            <h1 className="text-lg font-bold text-slate-800">Shrivatsam</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Sign in</h2>
              <p className="text-slate-500 text-sm">Enter your credentials to access the dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <TextField fullWidth label="Username" value={username}
                onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus
                InputProps={{ startAdornment: <InputAdornment position="start"><User size={16} color="#94A3B8" /></InputAdornment> }} />

              <TextField fullWidth label="Password" type={showPassword ? 'text' : 'password'}
                value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock size={16} color="#94A3B8" /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }} />

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-[#2563EB] hover:text-[#1A2744] font-medium transition-colors">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" fullWidth variant="contained" disabled={loading}
                sx={{
                  bgcolor: '#1A2744', py: 1.4, fontSize: '0.9rem', borderRadius: 2.5,
                  '&:hover': { bgcolor: '#0E172A', boxShadow: '0 8px 24px rgb(26 39 68 / 0.35)' },
                  '&:disabled': { bgcolor: '#CBD5E1', color: '#94A3B8' },
                }}
                endIcon={!loading && <ArrowRight size={16} />}>
                {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Sign In'}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1.5">
            <span className="w-4 h-4 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px]">🔒</span>
            Protected by bank-grade 256-bit SSL encryption
          </p>
        </div>
      </div>
    </div>
  )
}
