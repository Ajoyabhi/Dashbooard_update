import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Skeleton } from '@mui/material'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import api from '@/utils/axios'
import toast from 'react-hot-toast'

interface Charge { id: number; min_amount: number; max_amount: number; charge_percentage: number; charge_fixed: number }
const emptyForm = { min_amount: '', max_amount: '', charge_percentage: '', charge_fixed: '' }

export default function AgentUserCharges() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [charges, setCharges] = useState<Charge[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get(`/agent/users/${userId}/merchant-charges`)
      setCharges(r.data?.charges || r.data || [])
    } catch { toast.error('Failed to load charges') }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  const handleAdd = async () => {
    setSaving(true)
    try {
      await api.post(`/agent/users/${userId}/merchant-charges`, { min_amount: Number(form.min_amount), max_amount: Number(form.max_amount), charge_percentage: Number(form.charge_percentage), charge_fixed: Number(form.charge_fixed) })
      toast.success('Charge added')
      setOpen(false)
      setForm(emptyForm)
      fetch()
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add charge')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/agent/merchant-charges/${id}`)
      toast.success('Charge deleted')
      fetch()
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all"><ArrowLeft size={16} /></button>
          <div className="page-header mb-0"><h1 className="page-title">User Charges</h1><p className="page-subtitle">Manage charge ranges for this user</p></div>
        </div>
        <Button variant="contained" size="small" startIcon={<Plus size={14} />} onClick={() => setOpen(true)} sx={{ bgcolor: '#1A2744', borderRadius: 2 }}>Add Charge</Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? <div className="p-6"><Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} /></div> : charges.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No charges configured</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 bg-slate-50"><th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Min Amount</th><th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Max Amount</th><th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">% Charge</th><th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fixed Charge</th><th className="px-4 py-3" /></tr></thead>
            <tbody>{charges.map((c) => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-4 py-3">₹{c.min_amount}</td>
                <td className="px-4 py-3">₹{c.max_amount}</td>
                <td className="px-4 py-3">{c.charge_percentage}%</td>
                <td className="px-4 py-3">₹{c.charge_fixed}</td>
                <td className="px-4 py-3 text-right"><IconButton size="small" color="error" onClick={() => handleDelete(c.id)}><Trash2 size={14} /></IconButton></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Add Charge Range</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[['min_amount','Min Amount'],['max_amount','Max Amount'],['charge_percentage','% Charge'],['charge_fixed','Fixed Charge']].map(([k,l]) => (
              <TextField key={k} fullWidth label={l} type="number" size="small" value={form[k as keyof typeof form]} onChange={(e) => setForm(p => ({ ...p, [k]: e.target.value }))} />
            ))}
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: '#64748B' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={saving} sx={{ bgcolor: '#1A2744', borderRadius: 2 }}>Add</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
