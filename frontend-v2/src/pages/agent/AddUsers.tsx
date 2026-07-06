import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, IconButton, Tooltip, Avatar } from '@mui/material'
import { UserPlus, Eye, RefreshCw } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import api from '@/utils/axios'
import { formatCurrency, formatDate } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface UserRow { id: string; name: string; user_name: string; email: string; balance: number; status: string; created_at: string; [key: string]: unknown }

export default function AgentAddUsers() {
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/agent/users')
      setRows(res.data?.users ?? (Array.isArray(res.data) ? res.data : res.data?.data || []))
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const columns: Column<UserRow>[] = [
    { key: 'name', label: 'User', render: (r) => (
      <div className="flex items-center gap-2.5">
        <Avatar sx={{ width: 30, height: 30, bgcolor: '#1A2744', fontSize: '0.7rem', fontWeight: 700 }}>
          {(r.name || r.user_name || 'U').charAt(0).toUpperCase()}
        </Avatar>
        <div><p className="text-sm font-medium">{r.name}</p><p className="text-xs text-slate-400">@{r.user_name}</p></div>
      </div>
    )},
    { key: 'email', label: 'Email' },
    { key: 'balance', label: 'Balance', align: 'right', render: (r) => <span className="font-semibold text-emerald-700">{formatCurrency(r.balance)}</span> },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Joined', render: (r) => <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span> },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">My Users</h1>
          <p className="page-subtitle">{rows.length} users registered under you</p>
        </div>
        <div className="flex gap-2">
          <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={fetch} sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Refresh</Button>
          <Button size="small" variant="contained" startIcon={<UserPlus size={14} />}
            onClick={() => navigate('/agent/add-users/register')} sx={{ bgcolor: '#1A2744', borderRadius: 2 }}>Register User</Button>
        </div>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} searchKeys={['name', 'user_name', 'email']} emptyMessage="No users yet"
        actions={(row) => (
          <Tooltip title="View"><IconButton size="small" onClick={() => navigate(`/agent/users/${row.id}`)}><Eye size={15} /></IconButton></Tooltip>
        )} />
    </div>
  )
}
