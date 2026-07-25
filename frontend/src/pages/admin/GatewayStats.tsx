import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, TrendingUp, Activity, CheckCircle, XCircle, Clock,
  IndianRupee, Zap, BarChart2
} from 'lucide-react';
import api from '../../utils/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../data/mockData';
import { formatCurrency } from '../../utils/formatUtils';

interface GatewayStat {
  gateway: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  pendingRequests: number;
  successRate: number;
  totalCollection: number;
  totalAttemptedAmount: number;
  totalCharges: number;
}

interface Overall {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  pendingRequests: number;
  successRate: number;
  totalCollection: number;
  totalAttemptedAmount: number;
  totalCharges: number;
}

const GATEWAY_COLORS: Record<string, { bg: string; border: string; badge: string; icon: string }> = {
  Unpay:    { bg: 'bg-violet-50',  border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', icon: 'text-violet-500' },
  Spay:     { bg: 'bg-blue-50',    border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',     icon: 'text-blue-500' },
  HDFC:     { bg: 'bg-sky-50',     border: 'border-sky-200',    badge: 'bg-sky-100 text-sky-700',       icon: 'text-sky-500' },
  AirPay:   { bg: 'bg-emerald-50', border: 'border-emerald-200',badge: 'bg-emerald-100 text-emerald-700',icon: 'text-emerald-500' },
  SpayIcici:{ bg: 'bg-indigo-50',  border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700', icon: 'text-indigo-500' },
  Razorpay: { bg: 'bg-amber-50',   border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',   icon: 'text-amber-500' },
  Unknown:  { bg: 'bg-gray-50',    border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-600',     icon: 'text-gray-400' },
};

const getColor = (gateway: string) => GATEWAY_COLORS[gateway] ?? GATEWAY_COLORS['Unknown'];

const SuccessBar: React.FC<{ rate: number }> = ({ rate }) => (
  <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
    <div
      className={`h-2 rounded-full transition-all duration-500 ${rate >= 70 ? 'bg-green-500' : rate >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
      style={{ width: `${rate}%` }}
    />
  </div>
);

const StatPill: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
  <div className="flex flex-col items-center">
    <span className={`text-lg font-bold ${color}`}>{value}</span>
    <span className="text-xs text-gray-500 mt-0.5">{label}</span>
  </div>
);

export default function GatewayStats() {
  const [stats, setStats] = useState<GatewayStat[]>([]);
  const [overall, setOverall] = useState<Overall | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await api.get('/admin/gateway-stats', { params });
      if (data.success) {
        setStats(data.gateways);
        setOverall(data.overall);
      }
    } catch (e) {
      console.error('Failed to fetch gateway stats', e);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <div className="space-y-6 p-1">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gateway Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Collection &amp; success breakdown per payment gateway</p>
          </div>
          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Date filter */}
        <div className="flex flex-wrap gap-3 items-end bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">From</label>
            <input
              type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">To</label>
            <input
              type="date" value={to} onChange={e => setTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button
            onClick={fetchStats}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            Apply
          </button>
          {(from || to) && (
            <button
              onClick={() => { setFrom(''); setTo(''); }}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              Clear
            </button>
          )}
        </div>

        {/* Overall summary cards */}
        {overall && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Collection', value: formatCurrency(overall.totalCollection), icon: <IndianRupee size={18} />, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Total Requests', value: overall.totalRequests.toLocaleString(), icon: <Activity size={18} />, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Successful', value: overall.successfulRequests.toLocaleString(), icon: <CheckCircle size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Overall Success Rate', value: `${overall.successRate}%`, icon: <TrendingUp size={18} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                <div className={`${card.bg} ${card.color} p-2.5 rounded-lg`}>{card.icon}</div>
                <div>
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Gateway cards */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <RefreshCw size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : stats.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BarChart2 size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No data found for the selected period</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {stats.map(g => {
              const c = getColor(g.gateway);
              return (
                <div key={g.gateway} className={`rounded-2xl border ${c.border} ${c.bg} p-5 shadow-sm flex flex-col gap-4`}>

                  {/* Gateway header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={18} className={c.icon} />
                      <span className="font-semibold text-gray-800 text-base">{g.gateway}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
                      {g.successRate}% success
                    </span>
                  </div>

                  {/* Collection highlight */}
                  <div className="bg-white/70 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Total Collection</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(g.totalCollection)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Attempted</p>
                      <p className="text-sm font-medium text-gray-600">{formatCurrency(g.totalAttemptedAmount)}</p>
                    </div>
                  </div>

                  {/* Request breakdown */}
                  <div className="grid grid-cols-3 gap-2 bg-white/70 rounded-xl px-3 py-3">
                    <StatPill label="Total" value={g.totalRequests.toLocaleString()} color="text-gray-700" />
                    <StatPill label="Success" value={g.successfulRequests.toLocaleString()} color="text-green-600" />
                    <StatPill label="Failed" value={g.failedRequests.toLocaleString()} color="text-red-500" />
                  </div>

                  {/* Pending + charges row */}
                  <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-yellow-500" />
                      {g.pendingRequests} pending
                    </span>
                    <span className="flex items-center gap-1">
                      <IndianRupee size={12} className="text-gray-400" />
                      {formatCurrency(g.totalCharges)} charges earned
                    </span>
                  </div>

                  {/* Success rate bar */}
                  <div className="px-1">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Success rate</span>
                      <span className="font-medium">{g.successRate}%</span>
                    </div>
                    <SuccessBar rate={g.successRate} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Comparison table */}
        {!loading && stats.length > 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-700 text-sm">Side-by-side Comparison</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Gateway', 'Collection', 'Attempted', 'Requests', 'Success', 'Failed', 'Pending', 'Success Rate', 'Charges'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.map((g, i) => {
                    const c = getColor(g.gateway);
                    return (
                      <tr key={g.gateway} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${c.badge}`}>
                            <Zap size={10} />{g.gateway}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-green-700 whitespace-nowrap">{formatCurrency(g.totalCollection)}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatCurrency(g.totalAttemptedAmount)}</td>
                        <td className="px-4 py-3 text-gray-700 font-medium">{g.totalRequests.toLocaleString()}</td>
                        <td className="px-4 py-3 text-emerald-600 font-medium">{g.successfulRequests.toLocaleString()}</td>
                        <td className="px-4 py-3 text-red-500 font-medium">{g.failedRequests.toLocaleString()}</td>
                        <td className="px-4 py-3 text-yellow-600 font-medium">{g.pendingRequests.toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${g.successRate >= 70 ? 'bg-green-500' : g.successRate >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                style={{ width: `${g.successRate}%` }}
                              />
                            </div>
                            <span className={`font-semibold ${g.successRate >= 70 ? 'text-green-600' : g.successRate >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                              {g.successRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatCurrency(g.totalCharges)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {overall && (
                  <tfoot className="bg-indigo-50 font-semibold">
                    <tr>
                      <td className="px-4 py-3 text-indigo-700">Total</td>
                      <td className="px-4 py-3 text-green-700">{formatCurrency(overall.totalCollection)}</td>
                      <td className="px-4 py-3 text-gray-700">{formatCurrency(overall.totalAttemptedAmount)}</td>
                      <td className="px-4 py-3 text-gray-700">{overall.totalRequests.toLocaleString()}</td>
                      <td className="px-4 py-3 text-emerald-700">{overall.successfulRequests.toLocaleString()}</td>
                      <td className="px-4 py-3 text-red-600">{overall.failedRequests.toLocaleString()}</td>
                      <td className="px-4 py-3 text-yellow-700">{overall.pendingRequests.toLocaleString()}</td>
                      <td className="px-4 py-3 text-indigo-700">{overall.successRate}%</td>
                      <td className="px-4 py-3 text-gray-700">{formatCurrency(overall.totalCharges)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
