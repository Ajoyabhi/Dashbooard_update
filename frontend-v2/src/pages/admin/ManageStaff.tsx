import { useState, useEffect, useCallback } from 'react'
import { Button } from '@mui/material'
import { Plus, RefreshCw } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import api from '@/utils/axios'
import { formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface Row { id: string; name: string; email: string; role: string; status: string; created_at: string; [key: string]: unknown }

const columns: Column<Row>[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created', render: (r) => <span className="text-xs text-slate-400">{formatDateTime(r.created_at)}</span> },
]

export default function ManageStaff() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/admin/staff'); setRows(Array.isArray(r.data) ? r.data : r.data?.data || []) }
    catch { toast.error('Failed to load staff') } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetch() }, [fetch])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="page-header mb-0"><h1 className="page-title">Manage Staff</h1><p className="page-subtitle">Manage admin staff members</p></div>
        <div className="flex gap-2">
          <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={fetch} sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Refresh</Button>
          <Button size="small" variant="contained" startIcon={<Plus size={14} />} sx={{ bgcolor: '#1A2744', borderRadius: 2 }}>Add Staff</Button>
        </div>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} searchKeys={['name', 'email', 'role']} emptyMessage="No staff members" />
    </div>
  )
}
