import { useState, useEffect } from 'react'
import { Button, TextField, Skeleton } from '@mui/material'
import { Copy, Eye, EyeOff, RefreshCw, Key } from 'lucide-react'
import api from '@/utils/axios'
import toast from 'react-hot-toast'

interface Settings { api_key: string; jwt_token: string; webhook_url: string }

export default function AgentDeveloperSettings() {
  const [data, setData] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [showToken, setShowToken] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    api.get('/agent/developer-settings')
      .then((r) => { setData(r.data); setWebhookUrl(r.data?.webhook_url || '') })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const copy = (val: string, label: string) => { navigator.clipboard.writeText(val); toast.success(`${label} copied`) }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const r = await api.post('/agent/regenerate-api-key')
      setData((p) => p ? { ...p, api_key: r.data?.api_key || p.api_key } : p)
      toast.success('API key regenerated')
    } catch { toast.error('Failed to regenerate') }
    finally { setRegenerating(false) }
  }

  const handleSaveWebhook = async () => {
    setSaving(true)
    try { await api.post('/agent/developer-settings', { webhook_url: webhookUrl }); toast.success('Webhook URL saved') }
    catch { toast.error('Failed to save') } finally { setSaving(false) }
  }

  if (loading) return <div className="space-y-4"><Skeleton height={40} width={250} /><div className="bg-white rounded-2xl border border-slate-200 p-6"><Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} /></div></div>

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div className="page-header"><h1 className="page-title">Developer Settings</h1><p className="page-subtitle">API credentials and webhook configuration</p></div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Key size={12} />API Key</p>
          <div className="flex gap-2">
            <TextField fullWidth size="small" value={data?.api_key || ''} InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }} />
            <Button variant="outlined" size="small" startIcon={<Copy size={13} />} onClick={() => copy(data?.api_key || '', 'API key')} sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Copy</Button>
            <Button variant="outlined" size="small" startIcon={<RefreshCw size={13} />} onClick={handleRegenerate} disabled={regenerating} sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2, whiteSpace: 'nowrap' }}>Regenerate</Button>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">JWT Token</p>
          <div className="flex gap-2">
            <TextField fullWidth size="small" type={showToken ? 'text' : 'password'} value={data?.jwt_token || ''} InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }} />
            <Button variant="outlined" size="small" startIcon={showToken ? <EyeOff size={13} /> : <Eye size={13} />} onClick={() => setShowToken(!showToken)} sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>{showToken ? 'Hide' : 'Show'}</Button>
            <Button variant="outlined" size="small" startIcon={<Copy size={13} />} onClick={() => copy(data?.jwt_token || '', 'JWT token')} sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Copy</Button>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Webhook URL</p>
          <div className="flex gap-2">
            <TextField fullWidth size="small" placeholder="https://yoursite.com/webhook" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
            <Button variant="contained" size="small" onClick={handleSaveWebhook} disabled={saving} sx={{ bgcolor: '#1A2744', borderRadius: 2, whiteSpace: 'nowrap' }}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
