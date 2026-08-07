import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Skeleton, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material'
import { ArrowLeft, Plus, Trash2, Shield, Percent, Save } from 'lucide-react'
import api from '@/utils/axios'
import toast from 'react-hot-toast'
import { formatDateTime } from '@/utils/formatUtils'

interface ChargeRange {
  id: string; start_amount: number; end_amount: number
  payin_start_amount: number | null; payin_end_amount: number | null
  payout_start_amount: number | null; payout_end_amount: number | null
  admin_payin_charge: number; admin_payout_charge: number
  admin_payin_charge_type: 'percentage' | 'fixed'; admin_payout_charge_type: 'percentage' | 'fixed'
}
interface PlatformCharge { id: string; charge: number; gst: number; updated_at: string }
interface IPAddress { id: string; ip_address: string; updated_at: string }

const emptyRange = {
  payin_start_amount: '', payin_end_amount: '',
  payout_start_amount: '', payout_end_amount: '',
  admin_payin_charge: '', admin_payout_charge: '',
  admin_payin_charge_type: 'percentage', admin_payout_charge_type: 'percentage',
}

function SectionCard({ title, icon, action, children }: {
  title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">{icon}{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function THead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-slate-100 bg-slate-50">
        {cols.map((c) => (
          <th key={c} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{c}</th>
        ))}
      </tr>
    </thead>
  )
}

export default function UserCharges() {
  const { userId } = useParams()
  const navigate = useNavigate()

  const [charges, setCharges] = useState<ChargeRange[]>([])
  const [platformCharges, setPlatformCharges] = useState<PlatformCharge[]>([])
  const [ips, setIPs] = useState<IPAddress[]>([])
  const [loading, setLoading] = useState(true)

  const [rangeOpen, setRangeOpen] = useState(false)
  const [platformOpen, setPlatformOpen] = useState(false)
  const [ipOpen, setIpOpen] = useState(false)

  const [rangeForm, setRangeForm] = useState({ ...emptyRange })
  const [platformForm, setPlatformForm] = useState({ charge: '', gst: '' })
  const [ipForm, setIpForm] = useState({ ip_address: '' })
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, pRes, iRes] = await Promise.all([
        api.get(`/admin/users/${userId}/merchant-charges`),
        api.get('/admin/platform-charges'),
        api.get(`/admin/users/${userId}/ips`),
      ])
      setCharges(cRes.data?.data ?? (Array.isArray(cRes.data) ? cRes.data : []))
      setPlatformCharges(pRes.data?.data ?? (Array.isArray(pRes.data) ? pRes.data : []))
      setIPs(iRes.data?.data ?? (Array.isArray(iRes.data) ? iRes.data : []))
    } catch { toast.error('Failed to load data') }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleAddRange = async () => {
    if (!rangeForm.payin_start_amount || !rangeForm.payin_end_amount) return toast.error('Payin start and end amount required')
    if (Number(rangeForm.payin_start_amount) >= Number(rangeForm.payin_end_amount)) return toast.error('Payin start must be less than payin end amount')
    if (!rangeForm.payout_start_amount || !rangeForm.payout_end_amount) return toast.error('Payout start and end amount required')
    if (Number(rangeForm.payout_start_amount) >= Number(rangeForm.payout_end_amount)) return toast.error('Payout start must be less than payout end amount')
    setSaving(true)
    try {
      await api.post(`/admin/users/${userId}/merchant-charges`, {
        payin_start_amount: Number(rangeForm.payin_start_amount),
        payin_end_amount: Number(rangeForm.payin_end_amount),
        payout_start_amount: Number(rangeForm.payout_start_amount),
        payout_end_amount: Number(rangeForm.payout_end_amount),
        admin_payin_charge: Number(rangeForm.admin_payin_charge) || 0,
        admin_payout_charge: Number(rangeForm.admin_payout_charge) || 0,
        admin_payin_charge_type: rangeForm.admin_payin_charge_type,
        admin_payout_charge_type: rangeForm.admin_payout_charge_type,
      })
      toast.success('Charge range added')
      setRangeOpen(false)
      setRangeForm({ ...emptyRange })
      fetchAll()
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add')
    } finally { setSaving(false) }
  }

  const handleDeleteRange = async (id: string) => {
    try {
      await api.delete(`/admin/users/${userId}/merchant-charges/${id}`)
      setCharges((p) => p.filter((c) => c.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  const handleAddPlatform = async () => {
    if (platformForm.charge === '' || platformForm.gst === '') return toast.error('Charge and GST are required')
    setSaving(true)
    try {
      await api.post('/admin/platform-charges', { charge: Number(platformForm.charge), gst: Number(platformForm.gst) })
      toast.success('Platform charge saved')
      setPlatformOpen(false)
      setPlatformForm({ charge: '', gst: '' })
      fetchAll()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleDeletePlatform = async (id: string) => {
    try {
      await api.delete(`/admin/platform-charges/${id}`)
      setPlatformCharges((p) => p.filter((c) => c.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  const handleAddIP = async () => {
    if (!ipForm.ip_address) return toast.error('IP address required')
    setSaving(true)
    try {
      await api.post(`/admin/users/${userId}/ips`, { ip_address: ipForm.ip_address })
      toast.success('IP whitelisted')
      setIpOpen(false)
      setIpForm({ ip_address: '' })
      fetchAll()
    } catch { toast.error('Failed to add IP') }
    finally { setSaving(false) }
  }

  const handleDeleteIP = async (id: string) => {
    try {
      await api.delete(`/admin/users/${userId}/ips/${id}`)
      setIPs((p) => p.filter((i) => i.id !== id))
      toast.success('Removed')
    } catch { toast.error('Failed to remove') }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all">
            <ArrowLeft size={16} />
          </button>
          <div className="page-header mb-0">
            <h1 className="page-title">User Charges</h1>
            <p className="page-subtitle">Charge ranges · Platform GST · IP whitelist</p>
          </div>
        </div>
        <Button variant="contained" size="small" startIcon={<Save size={14} />}
          onClick={() => toast.success('All changes are saved automatically')}
          sx={{ bgcolor: '#1A2744', borderRadius: 2 }}>
          Save Changes
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={160} sx={{ borderRadius: 3 }} />)}
        </div>
      ) : (
        <>
          {/* Charge Ranges */}
          <SectionCard
            title="Charge Ranges"
            icon={<Percent size={15} className="text-[#1A2744]" />}
            action={
              <Button size="small" variant="contained" startIcon={<Plus size={13} />}
                onClick={() => setRangeOpen(true)}
                sx={{ bgcolor: '#1A2744', borderRadius: 2, fontSize: '0.72rem' }}>
                Add Range
              </Button>
            }
          >
            {charges.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-slate-400 text-sm">No charge ranges configured</div>
            ) : (
              <table className="w-full text-sm">
                <THead cols={['Payin Range', 'Payin Charge', 'Payin Type', 'Payout Range', 'Payout Charge', 'Payout Type', '']} />
                <tbody>
                  {charges.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-700">₹{c.payin_start_amount ?? c.start_amount} – ₹{c.payin_end_amount ?? c.end_amount}</td>
                      <td className="px-4 py-3">{c.admin_payin_charge}{c.admin_payin_charge_type === 'percentage' ? '%' : ' ₹'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${c.admin_payin_charge_type === 'percentage' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                          {c.admin_payin_charge_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">₹{c.payout_start_amount ?? c.start_amount} – ₹{c.payout_end_amount ?? c.end_amount}</td>
                      <td className="px-4 py-3">{c.admin_payout_charge}{c.admin_payout_charge_type === 'percentage' ? '%' : ' ₹'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${c.admin_payout_charge_type === 'percentage' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                          {c.admin_payout_charge_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <IconButton size="small" color="error" onClick={() => handleDeleteRange(c.id)}><Trash2 size={14} /></IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>

          {/* Platform Charges / GST */}
          <SectionCard
            title="Platform Charges & GST"
            icon={<Percent size={15} className="text-amber-500" />}
            action={
              <Button size="small" variant="outlined" startIcon={<Plus size={13} />}
                onClick={() => setPlatformOpen(true)}
                sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2, fontSize: '0.72rem' }}>
                Set GST / Charge
              </Button>
            }
          >
            {platformCharges.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-slate-400 text-sm">No platform charges set</div>
            ) : (
              <table className="w-full text-sm">
                <THead cols={['Charge (%)', 'GST (%)', 'Last Updated', '']} />
                <tbody>
                  {platformCharges.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-emerald-700">{c.charge}%</td>
                      <td className="px-4 py-3 font-semibold text-amber-600">{c.gst}%</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(c.updated_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <IconButton size="small" color="error" onClick={() => handleDeletePlatform(c.id)}><Trash2 size={14} /></IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>

          {/* IP Whitelist */}
          <SectionCard
            title="IP Whitelist"
            icon={<Shield size={15} className="text-emerald-600" />}
            action={
              <Button size="small" variant="outlined" startIcon={<Plus size={13} />}
                onClick={() => setIpOpen(true)}
                sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2, fontSize: '0.72rem' }}>
                Add IP
              </Button>
            }
          >
            {ips.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-slate-400 text-sm">No IPs whitelisted — all IPs allowed</div>
            ) : (
              <table className="w-full text-sm">
                <THead cols={['IP Address', 'Added On', '']} />
                <tbody>
                  {ips.map((ip) => (
                    <tr key={ip.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-slate-700">{ip.ip_address}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(ip.updated_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <IconButton size="small" color="error" onClick={() => handleDeleteIP(ip.id)}><Trash2 size={14} /></IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        </>
      )}

      {/* Add Charge Range Dialog */}
      <Dialog open={rangeOpen} onClose={() => setRangeOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Add Charge Range</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="col-span-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">Payin</div>
            <TextField label="Payin Start Amount *" type="number" size="small" value={rangeForm.payin_start_amount}
              onChange={(e) => setRangeForm((p) => ({ ...p, payin_start_amount: e.target.value }))} />
            <TextField label="Payin End Amount *" type="number" size="small" value={rangeForm.payin_end_amount}
              onChange={(e) => setRangeForm((p) => ({ ...p, payin_end_amount: e.target.value }))} />
            <TextField label="Payin Charge" type="number" size="small" value={rangeForm.admin_payin_charge}
              onChange={(e) => setRangeForm((p) => ({ ...p, admin_payin_charge: e.target.value }))} />
            <FormControl size="small">
              <InputLabel>Payin Type</InputLabel>
              <Select value={rangeForm.admin_payin_charge_type} label="Payin Type"
                onChange={(e) => setRangeForm((p) => ({ ...p, admin_payin_charge_type: e.target.value }))}>
                <MenuItem value="percentage">Percentage</MenuItem>
                <MenuItem value="fixed">Fixed</MenuItem>
              </Select>
            </FormControl>
            <div className="col-span-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mt-2">Payout</div>
            <TextField label="Payout Start Amount *" type="number" size="small" value={rangeForm.payout_start_amount}
              onChange={(e) => setRangeForm((p) => ({ ...p, payout_start_amount: e.target.value }))} />
            <TextField label="Payout End Amount *" type="number" size="small" value={rangeForm.payout_end_amount}
              onChange={(e) => setRangeForm((p) => ({ ...p, payout_end_amount: e.target.value }))} />
            <TextField label="Payout Charge" type="number" size="small" value={rangeForm.admin_payout_charge}
              onChange={(e) => setRangeForm((p) => ({ ...p, admin_payout_charge: e.target.value }))} />
            <FormControl size="small">
              <InputLabel>Payout Type</InputLabel>
              <Select value={rangeForm.admin_payout_charge_type} label="Payout Type"
                onChange={(e) => setRangeForm((p) => ({ ...p, admin_payout_charge_type: e.target.value }))}>
                <MenuItem value="percentage">Percentage</MenuItem>
                <MenuItem value="fixed">Fixed</MenuItem>
              </Select>
            </FormControl>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRangeOpen(false)} sx={{ color: '#64748B' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddRange} disabled={saving} sx={{ bgcolor: '#1A2744', borderRadius: 2 }}>Add Range</Button>
        </DialogActions>
      </Dialog>

      {/* Platform Charge / GST Dialog */}
      <Dialog open={platformOpen} onClose={() => setPlatformOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Set Platform Charge & GST</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <div className="space-y-3 mt-1">
            <TextField fullWidth label="Charge (%)" type="number" size="small" value={platformForm.charge}
              onChange={(e) => setPlatformForm((p) => ({ ...p, charge: e.target.value }))} />
            <TextField fullWidth label="GST (%)" type="number" size="small" value={platformForm.gst}
              onChange={(e) => setPlatformForm((p) => ({ ...p, gst: e.target.value }))} />
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPlatformOpen(false)} sx={{ color: '#64748B' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddPlatform} disabled={saving} sx={{ bgcolor: '#1A2744', borderRadius: 2 }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Whitelist IP Dialog */}
      <Dialog open={ipOpen} onClose={() => setIpOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Whitelist IP Address</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField fullWidth label="IP Address" size="small" placeholder="192.168.1.1"
            value={ipForm.ip_address} onChange={(e) => setIpForm({ ip_address: e.target.value })} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIpOpen(false)} sx={{ color: '#64748B' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddIP} disabled={saving} sx={{ bgcolor: '#1A2744', borderRadius: 2 }}>Add IP</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
