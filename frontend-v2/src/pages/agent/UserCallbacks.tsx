import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, TextField, Skeleton } from '@mui/material'
import { ArrowLeft, Save, TestTube } from 'lucide-react'
import api from '@/utils/axios'
import toast from 'react-hot-toast'

interface CallbackData { payin_callback_url: string; payout_callback_url: string }

export default function AgentUserCallbacks() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<CallbackData>({ payin_callback_url: '', payout_callback_url: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get(`/agent/users/${userId}/callback`)
      setData({ payin_callback_url: r.data?.payin_callback_url || '', payout_callback_url: r.data?.payout_callback_url || '' })
    } catch { toast.error('Failed to load callbacks') }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post(`/agent/users/${userId}/callback`, data)
      toast.success('Callbacks saved')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleTest = async (type: string) => {
    setTesting(type)
    try {
      await api.post(`/agent/users/${userId}/test-callback`, { type })
      toast.success(`${type} test callback sent`)
    } catch { toast.error('Test failed') }
    finally { setTesting(null) }
  }

  if (loading) return <div className="space-y-4"><Skeleton height={40} width={200} /><div className="bg-white rounded-2xl border border-slate-200 p-6"><Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} /></div></div>

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all"><ArrowLeft size={16} /></button>
        <div className="page-header mb-0"><h1 className="page-title">Callback URLs</h1><p className="page-subtitle">Configure payin and payout callback endpoints</p></div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        {[{ key: 'payin_callback_url', label: 'Payin Callback URL', type: 'payin' }, { key: 'payout_callback_url', label: 'Payout Callback URL', type: 'payout' }].map(({ key, label, type }) => (
          <div key={key} className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
            <div className="flex gap-2">
              <TextField fullWidth size="small" placeholder="https://yoursite.com/callback" value={data[key as keyof CallbackData]} onChange={(e) => setData((p) => ({ ...p, [key]: e.target.value }))} />
              <Button variant="outlined" size="small" startIcon={<TestTube size={13} />} disabled={testing === type} onClick={() => handleTest(type)} sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2, whiteSpace: 'nowrap', minWidth: 100 }}>
                {testing === type ? 'Testing...' : 'Test'}
              </Button>
            </div>
          </div>
        ))}
        <Button variant="contained" startIcon={<Save size={14} />} onClick={handleSave} disabled={saving} sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>
          {saving ? 'Saving...' : 'Save Callbacks'}
        </Button>
      </div>
    </div>
  )
}
