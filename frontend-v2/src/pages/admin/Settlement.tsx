import { useState, useEffect, useCallback } from 'react'
import {
  Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, CircularProgress, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Paper, Typography,
} from '@mui/material'
import { RefreshCw, History, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/utils/axios'
import { formatCurrency, formatDateTime } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

interface SettlementUser {
  id: number; name: string; user_name: string; mobile: string
  wallet: number; settlement: number
}

interface SettlementTx {
  id: number; amount: number; wallet_balance_before: number; wallet_balance_after: number
  settlement_balance_before: number; settlement_balance_after: number
  status: string; remark: string; created_at: string
  updater?: { name: string; user_name: string }
}

export default function AdminSettlement() {
  const [users, setUsers] = useState<SettlementUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Process modal
  const [processOpen, setProcessOpen] = useState(false)
  const [selected, setSelected] = useState<SettlementUser | null>(null)
  const [amount, setAmount] = useState('')
  const [remark, setRemark] = useState('')
  const [processing, setProcessing] = useState(false)

  // History modal
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyUser, setHistoryUser] = useState<SettlementUser | null>(null)
  const [historyTxns, setHistoryTxns] = useState<SettlementTx[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/settlement-dashboard')
      const d = res.data?.data
      setUsers(Array.isArray(d) ? d : [])
    } catch { toast.error('Failed to load settlement data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const fetchHistory = useCallback(async (userId: number, page: number) => {
    setHistoryLoading(true)
    try {
      const res = await api.get(`/admin/settlement-history/${userId}`, { params: { page, pageSize: 10 } })
      const d = res.data?.data
      setHistoryTxns(d?.transactions ?? [])
      setHistoryTotalPages(d?.pagination?.totalPages ?? 1)
    } catch { toast.error('Failed to load history') }
    finally { setHistoryLoading(false) }
  }, [])

  const openProcess = (user: SettlementUser) => {
    setSelected(user); setAmount(''); setRemark(''); setProcessOpen(true)
  }

  const openHistory = (user: SettlementUser) => {
    setHistoryUser(user); setHistoryPage(1); setHistoryOpen(true)
    fetchHistory(user.id, 1)
  }

  const handlePageChange = (p: number) => {
    setHistoryPage(p)
    if (historyUser) fetchHistory(historyUser.id, p)
  }

  const processSettlement = async () => {
    if (!selected || !amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return toast.error('Enter a valid amount')
    if (Number(amount) > selected.wallet)
      return toast.error('Amount exceeds wallet balance')
    setProcessing(true)
    try {
      await api.post('/admin/settle-amount', {
        user_id: selected.id,
        amount_: parseFloat(amount),
        remark,
      })
      toast.success('Settlement processed successfully')
      setProcessOpen(false); fetchUsers()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to process settlement')
    } finally { setProcessing(false) }
  }

  const filtered = search
    ? users.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.user_name.toLowerCase().includes(search.toLowerCase()) ||
        u.mobile.includes(search)
      )
    : users

  const totalWallet = users.reduce((s, u) => s + (u.wallet || 0), 0)
  const totalSettlement = users.reduce((s, u) => s + (u.settlement || 0), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Settlement</h1>
          <p className="page-subtitle">Manage user wallet settlements</p>
        </div>
        <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={fetchUsers}
          sx={{ borderColor: '#E2E8F0', color: '#64748B', borderRadius: 2 }}>Refresh</Button>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Total Users', value: users.length, currency: false },
          { label: 'Total Wallet Balance', value: formatCurrency(totalWallet), currency: true },
          { label: 'Total Settlement Balance', value: formatCurrency(totalSettlement), currency: true },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-2.5">
            <span className="text-xs text-slate-500">{s.label}</span>
            <span className={`font-bold ${s.currency ? 'text-emerald-700' : 'text-slate-800'}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Search + Table */}
      <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
        <div className="p-3 border-b border-slate-100">
          <TextField size="small" placeholder="Search by name, username or mobile..."
            value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 320 }} />
        </div>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['#', 'Name', 'Username', 'Mobile', 'Wallet Balance', 'Settlement Balance', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#64748B' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} sx={{ color: '#1A2744' }} />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">No users found</Typography>
                  </TableCell>
                </TableRow>
              ) : filtered.map((user, idx) => (
                <TableRow key={user.id} hover>
                  <TableCell sx={{ color: '#94A3B8', fontSize: '0.75rem' }}>{idx + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{user.name}</TableCell>
                  <TableCell sx={{ color: '#64748B' }}>{user.user_name}</TableCell>
                  <TableCell sx={{ color: '#64748B' }}>{user.mobile}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-emerald-700">{formatCurrency(user.wallet)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-blue-700">{formatCurrency(user.settlement)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Tooltip title="Process Settlement">
                        <IconButton size="small" onClick={() => openProcess(user)}
                          sx={{ color: '#fff', bgcolor: '#1A2744', borderRadius: 1.5, p: 0.7, '&:hover': { bgcolor: '#0E172A' } }}>
                          <DollarSign size={13} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Settlement History">
                        <IconButton size="small" onClick={() => openHistory(user)}
                          sx={{ color: '#fff', bgcolor: '#64748B', borderRadius: 1.5, p: 0.7, '&:hover': { bgcolor: '#475569' } }}>
                          <History size={13} />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Process Settlement Dialog */}
      <Dialog open={processOpen} onClose={() => setProcessOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Process Settlement</DialogTitle>
        <DialogContent>
          {selected && (
            <div className="space-y-4 pt-1">
              <div className="bg-slate-50 rounded-xl p-4 space-y-1 text-sm">
                <p><span className="text-slate-500">Name:</span> <span className="font-medium">{selected.name}</span></p>
                <p><span className="text-slate-500">Username:</span> <span className="font-medium">{selected.user_name}</span></p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Wallet Balance</p>
                  <p className="font-bold text-emerald-700 text-base">{formatCurrency(selected.wallet)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Settlement Balance</p>
                  <p className="font-bold text-blue-700 text-base">{formatCurrency(selected.settlement)}</p>
                </div>
              </div>
              <TextField fullWidth label="Settlement Amount (₹)" type="number" value={amount}
                onChange={(e) => setAmount(e.target.value)} autoFocus
                inputProps={{ min: 1, max: selected.wallet, step: 0.01 }}
                helperText={`Max: ${formatCurrency(selected.wallet)}`} />
              <TextField fullWidth label="Remark" value={remark} onChange={(e) => setRemark(e.target.value)} />
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setProcessOpen(false)} sx={{ color: '#64748B', borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={processSettlement} disabled={processing}
            sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>
            {processing ? 'Processing...' : 'Process Settlement'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Settlement History — {historyUser?.name}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {historyLoading ? (
            <div className="flex justify-center py-12"><CircularProgress size={28} sx={{ color: '#1A2744' }} /></div>
          ) : historyTxns.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No settlement history found</div>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Date', 'Amount', 'Wallet Before→After', 'Settlement Before→After', 'Status', 'Processed By', 'Remark'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.72rem', color: '#64748B', bgcolor: '#F8FAFC' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyTxns.map((tx) => (
                    <TableRow key={tx.id} hover>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#64748B' }}>{formatDateTime(tx.created_at)}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#1A2744' }}>{formatCurrency(tx.amount)}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>
                        <span className="text-slate-500">{formatCurrency(tx.wallet_balance_before)}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="text-emerald-700 font-medium">{formatCurrency(tx.wallet_balance_after)}</span>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>
                        <span className="text-slate-500">{formatCurrency(tx.settlement_balance_before)}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="text-blue-700 font-medium">{formatCurrency(tx.settlement_balance_after)}</span>
                      </TableCell>
                      <TableCell>
                        <Chip label={tx.status} size="small"
                          color={tx.status === 'completed' ? 'success' : 'error'}
                          sx={{ fontSize: '0.65rem', height: 20, borderRadius: '5px' }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#64748B' }}>{tx.updater?.user_name ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#64748B' }}>{tx.remark}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {historyTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <IconButton size="small" disabled={historyPage === 1} onClick={() => handlePageChange(historyPage - 1)}>
                <ChevronLeft size={16} />
              </IconButton>
              <span className="text-xs text-slate-500">Page {historyPage} of {historyTotalPages}</span>
              <IconButton size="small" disabled={historyPage === historyTotalPages} onClick={() => handlePageChange(historyPage + 1)}>
                <ChevronRight size={16} />
              </IconButton>
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setHistoryOpen(false)} sx={{ color: '#64748B', borderRadius: 2 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
