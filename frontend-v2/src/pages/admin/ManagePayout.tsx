import { useState, useEffect, useCallback } from 'react'
import { Button, IconButton, Tooltip } from '@mui/material'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import DataTable, { Column } from '@/components/ui/DataTable'
import api from '@/utils/axios'
import { formatCurrency, formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface PayoutRow {
  id: string; user_name: string; amount: number; account_number: string
  bank_name: string; ifsc: string; status: string; created_at: string; [key: string]: unknown
}

const columns: Column<PayoutRow>[] = [
  { key: 'user_name', label: 'User' },
  { key: 'account_number', label: 'Account No.' },
  { key: 'bank_name', label: 'Bank' },
  { key: 'ifsc', label: 'IFSC' },
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-bold">{formatCurrency(r.amount)}</span> },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Date', render: (r) => <span className="text-xs text-slate-400">{formatDateTime(r.created_at)}</span> },
]

export default function ManagePayout() {
  const [rows, setRows] = useState<PayoutRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/payout-transactions')
      const d = res.data?.data
      setRows(d?.transactions ?? (Array.isArray(d) ? d : []))
    } catch { toast.error('Failed to load payouts') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleApprove = async (id: string) => {
    try { await api.post(`/admin/payout/${id}/approve`); toast.success('Approved'); fetch() }
    catch { toast.error('Failed to approve') }
  }

  const handleReject = async (id: string) => {
    try { await api.post(`/admin/payout/${id}/reject`); toast.success('Rejected'); fetch() }
    catch { toast.error('Failed to reject') }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Manage Payouts</h1>
          <p className="page-subtitle">Review and process payout requests</p>
        </div>
        <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={fetch}
          sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Refresh</Button>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading}
        searchKeys={['user_name', 'account_number', 'bank_name', 'status']}
        emptyMessage="No payouts to manage"
        actions={(row) => row.status === 'pending' ? (
          <>
            <Tooltip title="Approve"><IconButton size="small" sx={{ color: '#10B981' }} onClick={() => handleApprove(row.id)}><CheckCircle size={16} /></IconButton></Tooltip>
            <Tooltip title="Reject"><IconButton size="small" sx={{ color: '#EF4444' }} onClick={() => handleReject(row.id)}><XCircle size={16} /></IconButton></Tooltip>
          </>
        ) : null} />
    </div>
  )
}
