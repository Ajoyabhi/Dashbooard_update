import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Skeleton } from '@mui/material'
import { Users, Wallet, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import api from '@/utils/axios'
import { formatCurrency } from '@/utils/formatUtils'
import { useAuth } from '@/context/AuthContext'

export default function AgentDashboard() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [chartData, setChartData] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useAuth()

  const fetchAll = async () => {
    try {
      const [dashRes, chartRes] = await Promise.all([
        api.get('/agent/dashboard'),
        api.get('/agent/lastNdays-transactions?days=7'),
      ])
      const payload = dashRes.data?.data ?? dashRes.data
      setData(payload)
      const chart = chartRes.data?.data ?? chartRes.data
      setChartData(Array.isArray(chart) ? chart : [])
    } catch { /* empty */ }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const d = data as Record<string, number | string> | null

  const stats = [
    { label: 'My Users', value: loading ? '—' : String(d?.totalUsers ?? d?.total_users ?? 0), icon: <Users size={20} />, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: 'Wallet Balance', value: loading ? '—' : formatCurrency(Number(d?.balance ?? d?.totalBalance ?? 0)), icon: <Wallet size={20} />, iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
    { label: 'Total Payin', value: loading ? '—' : formatCurrency(Number(d?.totalPayin ?? d?.total_payin ?? 0)), icon: <TrendingDown size={20} />, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Total Payout', value: loading ? '—' : formatCurrency(Number(d?.totalPayout ?? d?.total_payout ?? 0)), icon: <TrendingUp size={20} />, iconBg: 'bg-orange-50', iconColor: 'text-orange-500' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Agent Dashboard</h1>
          <p className="page-subtitle">Welcome, {user?.name || user?.user_name}</p>
        </div>
        <button onClick={() => { setRefreshing(true); fetchAll() }}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 transition-all">
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => loading ? <div key={s.label} className="stat-card"><Skeleton height={100} /></div> : <StatCard key={s.label} {...s} />)}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">7-Day Transaction Trend</h3>
        <p className="text-xs text-slate-400 mb-4">Payin vs Payout</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData as Record<string, unknown>[]}>
            <defs>
              <linearGradient id="agGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
            <Area type="monotone" dataKey="payin" name="Payin" stroke="#10B981" strokeWidth={2} fill="url(#agGrad)" />
            <Area type="monotone" dataKey="payout" name="Payout" stroke="#3B82F6" strokeWidth={2} fillOpacity={0} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
