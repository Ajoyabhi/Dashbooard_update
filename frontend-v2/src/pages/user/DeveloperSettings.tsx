import { useState, useEffect } from 'react'
import { Button, TextField, IconButton, Tooltip, Chip } from '@mui/material'
import { Copy, Eye, EyeOff, RefreshCw, CheckCircle } from 'lucide-react'
import api from '@/utils/axios'
import toast from 'react-hot-toast'

interface DevSettings { api_key?: string; jwt_token?: string; callback_url?: string }

export default function DeveloperSettings() {
  const [settings, setSettings] = useState<DevSettings>({})
  const [loading, setLoading] = useState(true)
  const [showToken, setShowToken] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    // JWT is stored locally at login under shrivatsam_token
    const jwt = localStorage.getItem('shrivatsam_token') || ''
    const storedUser = JSON.parse(localStorage.getItem('shrivatsam_user') || '{}')

    setSettings({
      jwt_token: jwt,
      api_key: storedUser?.user_key ?? storedUser?.api_key ?? '',
    })

    // Attempt to fetch merchant details for api_key + callback URL
    api.get('/user/merchant-details')
      .then((r) => {
        const d = r.data?.data ?? r.data ?? {}
        setSettings({
          jwt_token: jwt,
          api_key: d.user_key ?? d.api_key ?? storedUser?.user_key ?? '',
          callback_url: d.payin_callback ?? d.payout_callback ?? '',
        })
      })
      .catch(() => { /* api_key from localStorage is already set above */ })
      .finally(() => setLoading(false))
  }, [])

  const copy = (key: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopied(key); toast.success('Copied!')
    setTimeout(() => setCopied(null), 2000)
  }

  const CopyBtn = ({ id, value }: { id: string; value: string }) => (
    <Tooltip title={copied === id ? 'Copied!' : 'Copy'}>
      <IconButton size="small" onClick={() => copy(id, value)}>
        {copied === id ? <CheckCircle size={15} color="#10B981" /> : <Copy size={15} color="#94A3B8" />}
      </IconButton>
    </Tooltip>
  )

  const regenerate = async () => {
    try {
      const res = await api.post('/user/regenerate-api-key')
      setSettings((p) => ({ ...p, api_key: res.data.api_key }))
      toast.success('API key regenerated')
    } catch { toast.error('Failed to regenerate') }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Developer Settings</h1>
        <p className="page-subtitle">API credentials and integration configuration</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-amber-500 mt-0.5">⚠️</span>
        <p className="text-sm text-amber-800">Keep your API key and token confidential. Never expose them in client-side code.</p>
      </div>

      <div className="space-y-4">
        {/* API Key */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">API Key</h3>
              <p className="text-xs text-slate-400 mt-0.5">Authenticate your API requests</p>
            </div>
            <Chip label="Active" size="small" color="success" sx={{ fontSize: '0.65rem', height: 20, borderRadius: '5px' }} />
          </div>
          <div className="flex gap-2">
            <TextField fullWidth size="small" value={loading ? 'Loading...' : (settings.api_key || 'Not generated')}
              InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.8rem' },
                endAdornment: settings.api_key && <CopyBtn id="api_key" value={settings.api_key} /> }} />
            <Button variant="outlined" size="small" startIcon={<RefreshCw size={13} />} onClick={regenerate}
              sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2, whiteSpace: 'nowrap' }}>
              Regenerate
            </Button>
          </div>
        </div>

        {/* JWT Token */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">JWT Token</h3>
              <p className="text-xs text-slate-400 mt-0.5">Bearer token for API authorization</p>
            </div>
            <IconButton size="small" onClick={() => setShowToken(!showToken)}>
              {showToken ? <EyeOff size={15} color="#94A3B8" /> : <Eye size={15} color="#94A3B8" />}
            </IconButton>
          </div>
          <TextField fullWidth size="small"
            value={loading ? 'Loading...' : (showToken ? (settings.jwt_token || '') : '••••••••••••••••••••••••••••••')}
            InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.75rem' },
              endAdornment: settings.jwt_token && <CopyBtn id="jwt" value={settings.jwt_token} /> }} />
        </div>

        {/* Webhook URL */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Callback / Webhook URL</h3>
          <p className="text-xs text-slate-400 mb-3">We POST transaction updates to this URL</p>
          <TextField fullWidth size="small" placeholder="https://your-domain.com/webhook" defaultValue={settings.callback_url || ''} />
          <Button variant="contained" size="small" sx={{ mt: 2, bgcolor: '#1A2744', borderRadius: 2 }}>Save URL</Button>
        </div>
      </div>
    </div>
  )
}
