import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, IconButton, Tooltip, Avatar, Chip } from '@mui/material'
import { UserPlus, Eye, Edit2, Wallet, RefreshCw, Percent, Phone, ShieldCheck } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import api from '@/utils/axios'
import { formatCurrency } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface UserRow {
  id: string; name: string; username: string; email: string
  userType: string; walletBalance: number; settlement: number
  rollingReserve: number
  status: string; mobile: string; payin: boolean; payout: boolean
  [key: string]: unknown
}

export default function ManageUser() {
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/users')
      // returns plain array: [{ id, name, username, userType, walletBalance, status, ... }]
      setRows(Array.isArray(res.data) ? res.data : res.data?.data || [])
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const columns: Column<UserRow>[] = [
    { key: 'name', label: 'User', render: (r) => (
      <div className="flex items-center gap-2.5">
        <Avatar sx={{ width: 32, height: 32, bgcolor: '#1A2744', fontSize: '0.75rem', fontWeight: 700 }}>
          {(r.name || r.username || 'U').charAt(0).toUpperCase()}
        </Avatar>
        <div>
          <p className="text-sm font-medium text-slate-800">{r.name}</p>
          <p className="text-xs text-slate-400">@{r.username}</p>
        </div>
      </div>
    )},
    { key: 'email', label: 'Email', render: (r) => <span>{String(r.email || r.mobile || '—')}</span> },
    { key: 'userType', label: 'Role', render: (r) => (
      <Chip label={r.userType} size="small" variant="outlined"
        sx={{ fontSize: '0.7rem', fontWeight: 600, borderRadius: '6px', height: 22, borderColor: '#1A2744', color: '#1A2744' }} />
    )},
    { key: 'walletBalance', label: 'Wallet Balance', align: 'right', render: (r) => <span className="font-semibold text-emerald-700">{formatCurrency(r.walletBalance)}</span> },
    { key: 'settlement', label: 'Settlement Balance', align: 'right', render: (r) => <span className="font-semibold text-[#1A2744]">{formatCurrency(Number(r.settlement ?? 0))}</span> },
    { key: 'rollingReserve', label: 'Rolling Reserve', align: 'right', render: (r) => <span className="font-semibold text-amber-600">{formatCurrency(Number(r.rollingReserve ?? 0))}</span> },
    { key: 'status', label: 'Status', render: (r) => (
      <Chip label={String(r.status)} size="small"
        color={r.status === 'active' ? 'success' : 'error'}
        sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22, borderRadius: '6px' }} />
    )},
    { key: 'payin', label: 'Payin/Payout', render: (r) => (
      <div className="flex gap-1">
        <Chip label="IN" size="small" color={r.payin ? 'success' : 'default'}
          sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20, borderRadius: '4px' }} />
        <Chip label="OUT" size="small" color={r.payout ? 'success' : 'default'}
          sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20, borderRadius: '4px' }} />
      </div>
    )},
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Manage Users</h1>
          <p className="page-subtitle">{rows.length} registered users</p>
        </div>
        <div className="flex gap-2">
          <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={fetch}
            sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Refresh</Button>
          <Button size="small" variant="contained" startIcon={<UserPlus size={14} />}
            onClick={() => navigate('/admin/manage-user/add')}
            sx={{ bgcolor: '#1A2744', borderRadius: 2 }}>Add User</Button>
        </div>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading}
        searchKeys={['name', 'username', 'email', 'userType', 'mobile']} emptyMessage="No users found"
        actions={(row) => (
          <>
            <Tooltip title="View"><IconButton size="small" onClick={() => navigate(`/admin/manage-user/${row.id}`)}><Eye size={15} /></IconButton></Tooltip>
            <Tooltip title="Edit"><IconButton size="small" onClick={() => navigate(`/admin/manage-user/${row.id}/edit`)}><Edit2 size={15} /></IconButton></Tooltip>
            <Tooltip title="Charges"><IconButton size="small" sx={{ color: '#6366F1' }} onClick={() => navigate(`/admin/manage-user/${row.id}/charges`)}><Percent size={15} /></IconButton></Tooltip>
            <Tooltip title="Callbacks"><IconButton size="small" sx={{ color: '#0EA5E9' }} onClick={() => navigate(`/admin/manage-user/${row.id}/callbacks`)}><Phone size={15} /></IconButton></Tooltip>
            <Tooltip title="Add Fund"><IconButton size="small" sx={{ color: '#10B981' }} onClick={() => navigate(`/admin/manage-user/${row.id}/add-fund`)}><Wallet size={15} /></IconButton></Tooltip>
            <Tooltip title="Rolling Reserve"><IconButton size="small" sx={{ color: '#D97706' }} onClick={() => navigate(`/admin/manage-user/${row.id}/rolling-reserve`)}><ShieldCheck size={15} /></IconButton></Tooltip>
          </>
        )} />
    </div>
  )
}
