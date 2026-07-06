import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TextField, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material'
import { ArrowLeft, Save, Play } from 'lucide-react'
import api from '@/utils/axios'
import toast from 'react-hot-toast'

interface CallbackSettings {
  payinUrl: string; payinMethod: string
  payoutUrl: string; payoutMethod: string
  payinMerchantName: string; payoutMerchantName: string
}

export default function UserCallbacks() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [settings, setSettings] = useState<CallbackSettings>({
    payinUrl: '', payinMethod: 'POST', payoutUrl: '', payoutMethod: 'POST',
    payinMerchantName: '', payoutMerchantName: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<'payin' | 'payout' | null>(null)

  useEffect(() => {
    api.get(`/admin/users/${userId}/callback`)
      .then((r) => {
        if (r.data.success) {
          const { payin_callback, payout_callback, payin_merchant_name, payout_merchant_name } = r.data.data
          setSettings((p) => ({ ...p, payinUrl: payin_callback || '', payoutUrl: payout_callback || '', payinMerchantName: payin_merchant_name || '', payoutMerchantName: payout_merchant_name || '' }))
        }
      })
      .catch(() => toast.error('Failed to load callback settings'))
      .finally(() => setLoading(false))
  }, [userId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post(`/admin/users/${userId}/callback`, {
        payin_callback: settings.payinUrl, payin_method: settings.payinMethod,
        payout_callback: settings.payoutUrl, payout_method: settings.payoutMethod,
        payin_merchant_name: settings.payinMerchantName, payout_merchant_name: settings.payoutMerchantName,
      })
      toast.success('Callback settings saved')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleTest = async (type: 'payin' | 'payout') => {
    setTesting(type)
    try {
      await api.post(`/admin/users/${userId}/test-callback`, { type })
      toast.success(`${type} callback test sent`)
    } catch { toast.error('Test failed') }
    finally { setTesting(null) }
  }

  const set = (key: keyof CallbackSettings, val: string) => setSettings((p) => ({ ...p, [key]: val }))

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all"><ArrowLeft size={16} /></button>
        <div className="page-header mb-0">
          <h1 className="page-title">Callback Settings</h1>
          <p className="page-subtitle">Configure payin & payout callback URLs</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Payin */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />Payin Callback
            </h3>
            <Button size="small" variant="outlined" startIcon={<Play size={12} />}
              disabled={!settings.payinUrl || testing === 'payin'}
              onClick={() => handleTest('payin')}
              sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2, fontSize: '0.7rem' }}>
              {testing === 'payin' ? 'Testing...' : 'Test'}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <TextField fullWidth label="Payin Callback URL" value={settings.payinUrl}
                onChange={(e) => set('payinUrl', e.target.value)} placeholder="https://your-domain.com/payin-callback" size="small" />
            </div>
            <FormControl size="small">
              <InputLabel>Method</InputLabel>
              <Select value={settings.payinMethod} label="Method" onChange={(e) => set('payinMethod', e.target.value)}>
                <MenuItem value="POST">POST</MenuItem>
                <MenuItem value="GET">GET</MenuItem>
              </Select>
            </FormControl>
            <div className="sm:col-span-3">
              <TextField fullWidth label="Payin Merchant Name" value={settings.payinMerchantName}
                onChange={(e) => set('payinMerchantName', e.target.value)} size="small" />
            </div>
          </div>
        </div>

        {/* Payout */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />Payout Callback
            </h3>
            <Button size="small" variant="outlined" startIcon={<Play size={12} />}
              disabled={!settings.payoutUrl || testing === 'payout'}
              onClick={() => handleTest('payout')}
              sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2, fontSize: '0.7rem' }}>
              {testing === 'payout' ? 'Testing...' : 'Test'}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <TextField fullWidth label="Payout Callback URL" value={settings.payoutUrl}
                onChange={(e) => set('payoutUrl', e.target.value)} placeholder="https://your-domain.com/payout-callback" size="small" />
            </div>
            <FormControl size="small">
              <InputLabel>Method</InputLabel>
              <Select value={settings.payoutMethod} label="Method" onChange={(e) => set('payoutMethod', e.target.value)}>
                <MenuItem value="POST">POST</MenuItem>
                <MenuItem value="GET">GET</MenuItem>
              </Select>
            </FormControl>
            <div className="sm:col-span-3">
              <TextField fullWidth label="Payout Merchant Name" value={settings.payoutMerchantName}
                onChange={(e) => set('payoutMerchantName', e.target.value)} size="small" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="contained" startIcon={<Save size={15} />} onClick={handleSave} disabled={saving || loading}
          sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button variant="outlined" onClick={() => navigate(-1)} sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Cancel</Button>
      </div>
    </div>
  )
}
