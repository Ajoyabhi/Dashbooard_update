import React, { useState, useEffect, useRef } from 'react';
import { Download, History, X, Wallet, Save } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { adminMenuItems } from '../../data/mockData';
import { formatCurrency } from '../../utils/formatUtils';
import api from '../../utils/axios';

/**
 * Admin-facing Agent Commission dashboard, keyed PER USER (merchant).
 *
 * One row per merchant we have. For each we show the total charges we took,
 * the agent commission accrued/settled/payable (payin & payout separately),
 * and an inline-editable agent rate % applied across that user's charge slabs.
 *
 * Backend (all under /admin/agent-commission):
 *   GET  /admin/agent-commission                                -> per-user summary
 *   PUT  /admin/agent-commission/user/:userId/agent-charge      -> set agent rate
 *   POST /admin/agent-commission/user/:userId/settle            -> record settlement
 *   GET  /admin/agent-commission/user/:userId/settlements       -> history
 *   POST /admin/agent-commission/user/:userId/report            -> enqueue Excel job
 *   GET  /admin/agent-commission/report/:jobId/status           -> poll
 *   GET  /admin/agent-commission/report/:jobId/download         -> download .xlsx
 */

type CommissionType = 'payin' | 'payout';

interface UserRow {
  user_id: number;
  name: string;
  user_name: string;
  user_type: string;
  charge_payin_rate: number;
  charge_payout_rate: number;
  charge_payin_type: string;
  charge_payout_type: string;
  payin_total_charges: number;
  payout_total_charges: number;
  agent_payin_charge: number;
  agent_payout_charge: number;
  payin_accrued: number;
  payout_accrued: number;
  payin_settled: number;
  payout_settled: number;
  payin_payable: number;
  payout_payable: number;
}

interface SettlementRecord {
  id: number;
  type: CommissionType;
  amount: number;
  note: string | null;
  settled_by_name: string | null;
  created_at: string;
}

export default function AgentCommission() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline agent-rate editing: user_id -> { payin, payout } draft strings.
  const [rateDrafts, setRateDrafts] = useState<Record<number, { payin: string; payout: string }>>({});
  const [savingRateId, setSavingRateId] = useState<number | null>(null);

  // Settle modal
  const [showSettle, setShowSettle] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [settleType, setSettleType] = useState<CommissionType>('payin');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // History modal
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<SettlementRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Report (async Excel via background worker)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [overridePayinRate, setOverridePayinRate] = useState('');
  const [overridePayoutRate, setOverridePayoutRate] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchUsers();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/agent-commission');
      if (res.data.success) {
        const data: UserRow[] = res.data.data || [];
        setRows(data);
        // Seed the rate drafts from the current configured rates.
        const drafts: Record<number, { payin: string; payout: string }> = {};
        data.forEach((r) => {
          drafts[r.user_id] = {
            payin: String(r.agent_payin_charge ?? 0),
            payout: String(r.agent_payout_charge ?? 0),
          };
        });
        setRateDrafts(drafts);
      } else {
        setRows([]);
        setError(res.data.message || 'Failed to fetch commission data');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error fetching commission data');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (userId: number, key: CommissionType, value: string) => {
    setRateDrafts((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] || { payin: '0', payout: '0' }), [key]: value },
    }));
  };

  const saveRate = async (row: UserRow) => {
    const draft = rateDrafts[row.user_id] || { payin: '0', payout: '0' };
    const payin = parseFloat(draft.payin);
    const payout = parseFloat(draft.payout);
    if (isNaN(payin) || payin < 0 || isNaN(payout) || payout < 0) {
      window.showToast('error', 'Agent rates must be valid non-negative numbers');
      return;
    }
    try {
      setSavingRateId(row.user_id);
      const res = await api.put(`/admin/agent-commission/user/${row.user_id}/agent-charge`, {
        agent_payin_charge: payin,
        agent_payout_charge: payout,
      });
      if (res.data.success) {
        window.showToast('success', 'Agent rate updated');
        fetchUsers();
      } else {
        window.showToast('error', res.data.message || 'Failed to update rate');
      }
    } catch (err: any) {
      window.showToast('error', err.response?.data?.message || 'Failed to update rate');
    } finally {
      setSavingRateId(null);
    }
  };

  const openSettle = (row: UserRow, type: CommissionType) => {
    setSelectedUser(row);
    setSettleType(type);
    setSettleAmount('');
    setSettleNote('');
    setShowSettle(true);
  };

  const payableFor = (row: UserRow, type: CommissionType) =>
    type === 'payin' ? row.payin_payable : row.payout_payable;

  const processSettle = async () => {
    if (!selectedUser) return;
    const amount = parseFloat(settleAmount);
    const maxPayable = payableFor(selectedUser, settleType);
    if (!amount || amount <= 0) {
      window.showToast('error', 'Please enter a valid amount');
      return;
    }
    if (amount > maxPayable) {
      window.showToast('error', `Amount cannot exceed payable ${formatCurrency(maxPayable)}`);
      return;
    }
    try {
      setIsProcessing(true);
      const res = await api.post(`/admin/agent-commission/user/${selectedUser.user_id}/settle`, {
        type: settleType,
        amount,
        note: settleNote,
      });
      if (res.data.success) {
        window.showToast('success', res.data.message || 'Commission settled');
        setShowSettle(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        window.showToast('error', res.data.message || 'Failed to settle');
      }
    } catch (err: any) {
      window.showToast('error', err.response?.data?.message || 'Failed to settle');
    } finally {
      setIsProcessing(false);
    }
  };

  const openHistory = async (row: UserRow) => {
    setSelectedUser(row);
    setShowHistory(true);
    setHistory([]);
    try {
      setHistoryLoading(true);
      const res = await api.get(`/admin/agent-commission/user/${row.user_id}/settlements`);
      if (res.data.success) setHistory(res.data.data || []);
    } catch (err: any) {
      window.showToast('error', err.response?.data?.message || 'Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Enqueue an Excel report job, poll until ready, then download the .xlsx.
  const downloadReport = async (row: UserRow) => {
    try {
      setDownloadingId(row.user_id);
      const res = await api.post(`/admin/agent-commission/user/${row.user_id}/report`, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        overridePayinRate: overridePayinRate.trim() === '' ? undefined : overridePayinRate.trim(),
        overridePayoutRate: overridePayoutRate.trim() === '' ? undefined : overridePayoutRate.trim(),
      });
      if (!res.data.success || !res.data.data?.jobId) {
        window.showToast('error', res.data.message || 'Failed to start report');
        setDownloadingId(null);
        return;
      }
      const jobId = res.data.data.jobId;
      window.showToast('success', 'Report is being generated in the background…');

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const s = await api.get(`/admin/agent-commission/report/${jobId}/status`);
          const state = s.data?.data?.state;
          if (state === 'completed') {
            if (pollRef.current) clearInterval(pollRef.current);
            await fetchReportFile(jobId, row);
            setDownloadingId(null);
          } else if (state === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            window.showToast('error', 'Report generation failed');
            setDownloadingId(null);
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          setDownloadingId(null);
        }
      }, 2000);
    } catch (err: any) {
      window.showToast('error', err.response?.data?.message || 'Failed to start report');
      setDownloadingId(null);
    }
  };

  const fetchReportFile = async (jobId: string, row: UserRow) => {
    const res = await api.get(`/admin/agent-commission/report/${jobId}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `agent-commission-${row.user_name}-${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const columns = [
    {
      header: 'Merchant',
      accessor: 'name',
      cell: (_: any, row: UserRow) => (
        <div className="leading-tight">
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-gray-400">{row.user_name}</div>
        </div>
      ),
    },
    {
      header: 'Charge Imposed',
      accessor: 'charge_payin_rate',
      cell: (_: any, row: UserRow) => {
        const fmt = (v: number, t: string) => `${v ?? 0}${t === 'percentage' ? '%' : ' flat'}`;
        return (
          <div className="text-xs leading-tight">
            <div>payin <span className="font-medium">{fmt(row.charge_payin_rate, row.charge_payin_type)}</span></div>
            <div>payout <span className="font-medium">{fmt(row.charge_payout_rate, row.charge_payout_type)}</span></div>
          </div>
        );
      },
    },
    {
      header: 'Total Charges Taken',
      accessor: 'payin_total_charges',
      cell: (_: any, row: UserRow) => (
        <div className="text-xs leading-tight">
          <div>payin <span className="font-medium">{formatCurrency(row.payin_total_charges || 0)}</span></div>
          <div>payout <span className="font-medium">{formatCurrency(row.payout_total_charges || 0)}</span></div>
        </div>
      ),
    },
    {
      header: 'Agent Cut %',
      accessor: 'agent_payin_charge',
      cell: (_: any, row: UserRow) => {
        const draft = rateDrafts[row.user_id] || { payin: '0', payout: '0' };
        return (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 flex items-center gap-1">
              in
              <input
                type="number"
                value={draft.payin}
                onChange={(e) => updateDraft(row.user_id, 'payin', e.target.value)}
                className="w-16 rounded border-gray-300 text-xs py-0.5"
                min="0"
                step="0.01"
              />
            </label>
            <label className="text-xs text-gray-500 flex items-center gap-1">
              out
              <input
                type="number"
                value={draft.payout}
                onChange={(e) => updateDraft(row.user_id, 'payout', e.target.value)}
                className="w-16 rounded border-gray-300 text-xs py-0.5"
                min="0"
                step="0.01"
              />
            </label>
          </div>
        );
      },
    },
    {
      header: 'Payable',
      accessor: 'payin_payable',
      cell: (_: any, row: UserRow) => (
        <div className="text-xs leading-tight">
          <div>payin <span className="font-semibold text-green-600">{formatCurrency(row.payin_payable || 0)}</span></div>
          <div>payout <span className="font-semibold text-green-600">{formatCurrency(row.payout_payable || 0)}</span></div>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (_: any, row: UserRow) => (
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => saveRate(row)}
            disabled={savingRateId === row.user_id}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded flex items-center disabled:opacity-50"
          >
            <Save className="h-3 w-3 mr-1" />
            {savingRateId === row.user_id ? 'Saving…' : 'Save Rate'}
          </button>
          <button onClick={() => openSettle(row, 'payin')} className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-2 py-1 rounded">
            Settle Payin
          </button>
          <button onClick={() => openSettle(row, 'payout')} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded">
            Settle Payout
          </button>
          <button onClick={() => openHistory(row)} className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded flex items-center">
            <History className="h-3 w-3 mr-1" /> History
          </button>
          <button
            onClick={() => downloadReport(row)}
            disabled={downloadingId === row.user_id}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded flex items-center disabled:opacity-50"
          >
            <Download className="h-3 w-3 mr-1" />
            {downloadingId === row.user_id ? 'Generating…' : 'Excel'}
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout menuItems={adminMenuItems} title="Agent Commission">
        <div className="flex justify-center items-center h-64">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Agent Commission">
      <div className="space-y-6">
        {/* Filters + Excel override rates */}
        <div className="bg-white shadow-sm rounded-lg p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Override Payin Rate %</label>
              <input type="number" value={overridePayinRate} onChange={(e) => setOverridePayinRate(e.target.value)}
                placeholder="configured" min="0" step="0.01"
                className="w-28 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Override Payout Rate %</label>
              <input type="number" value={overridePayoutRate} onChange={(e) => setOverridePayoutRate(e.target.value)}
                placeholder="configured" min="0" step="0.01"
                className="w-28 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
            </div>
            <p className="text-xs text-gray-500 max-w-md">
              Date range + override rates apply to the <span className="font-medium">Excel export</span> only —
              the report recomputes each transaction's commission from the rate (so older transactions get real
              figures). Leave overrides blank to use the user's configured agent rate. Payable balances always
              reflect all-time accrued minus settled.
            </p>
          </div>
        </div>

        {error && <div className="text-red-500 text-center">{error}</div>}

        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <Table searchable={true} filterable={false} columns={columns} data={rows || []} pagination={true} />
          </div>
        </div>
      </div>

      {/* Settle Modal */}
      {showSettle && selectedUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Settle {settleType === 'payin' ? 'Payin' : 'Payout'} Commission
              </h3>
              <button onClick={() => setShowSettle(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4 text-sm text-gray-500">
              <div>
                <p><span className="font-medium">Merchant:</span> {selectedUser.name}</p>
                <p><span className="font-medium">Username:</span> {selectedUser.user_name}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="font-medium text-gray-700">Accrued</p>
                  <p className="text-primary-600">{formatCurrency(settleType === 'payin' ? selectedUser.payin_accrued : selectedUser.payout_accrued)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="font-medium text-gray-700">Settled</p>
                  <p className="text-primary-600">{formatCurrency(settleType === 'payin' ? selectedUser.payin_settled : selectedUser.payout_settled)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="font-medium text-gray-700">Payable</p>
                  <p className="text-green-600 font-semibold">{formatCurrency(payableFor(selectedUser, settleType))}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="Enter amount to settle" min="0" max={payableFor(selectedUser, settleType)} step="0.01"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">Note</label>
                <input type="text" value={settleNote} onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="Enter note (optional)"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                <p className="mt-1 text-xs text-gray-500">Maximum: {formatCurrency(payableFor(selectedUser, settleType))}</p>
              </div>

              <div className="flex justify-end space-x-3">
                <button onClick={() => setShowSettle(false)} disabled={isProcessing}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={processSettle} disabled={isProcessing}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
                  {isProcessing ? 'Processing...' : 'Settle Commission'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && selectedUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Wallet className="h-5 w-5 mr-2" /> Settlement History — {selectedUser.name}
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {historyLoading ? (
              <div className="flex justify-center items-center h-32">Loading...</div>
            ) : history.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No settlements yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-left">Note</th>
                      <th className="px-3 py-2 text-left">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td className="px-3 py-2">{new Date(h.created_at).toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2 capitalize">{h.type}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(h.amount || 0)}</td>
                        <td className="px-3 py-2">{h.note || '-'}</td>
                        <td className="px-3 py-2">{h.settled_by_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
