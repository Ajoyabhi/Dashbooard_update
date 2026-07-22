import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Select, MenuItem, FormControl, InputLabel, LinearProgress, Skeleton } from '@mui/material'
import { Wallet, TrendingDown, TrendingUp, Activity, ArrowUpCircle, BadgeCheck, RefreshCw, ShieldCheck } from 'lucide-react'
// BadgeCheck used in hero card settlement balance icon
import StatCard from '@/components/ui/StatCard'
import api from '@/utils/axios'
import { formatCurrency } from '@/utils/formatUtils'
import { useAuth } from '@/context/AuthContext'

export default function UserDashboard() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [chartData, setChartData] = useState<unknown[]>([])
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useAuth()

  const fetchAll = async () => {
    try {
      const [dashRes, chartRes] = await Promise.all([
        api.get('/user/dashboard'),
        api.get(`/user/lastNdays-transactions?days=${days}`),
      ])
      // unwrap { success, data: {...} } envelope
      const payload = dashRes.data?.data ?? dashRes.data
      setData(payload)
      const chart = chartRes.data?.data ?? chartRes.data
      setChartData(
        Array.isArray(chart)
          ? chart.map((item: Record<string, unknown>) => {
              const payin = item.payin as Record<string, number> | undefined
              const payout = item.payout as Record<string, number> | undefined
              const dateStr = String(item.date ?? '')
              const label = dateStr
                ? new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                : ''
              return {
                date: label,
                payin: payin?.total_amount ?? 0,
                payout: payout?.total_amount ?? 0,
                count: (payin?.transaction_count ?? 0) + (payout?.transaction_count ?? 0),
              }
            })
          : []
      )
    } catch { /* empty */ }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { fetchAll() }, [days])

  const d = data as Record<string, number | string> | null
  const walletBalance = Number(d?.wallet_balance ?? d?.walletBalance ?? 0)
  const settlementBalance = Number(d?.settlement_balance ?? d?.settlementBalance ?? 0)
  const rollingReserveBalance = Number(d?.rolling_reserve_balance ?? d?.rollingReserveBalance ?? 0)
  const totalPayin = Number(d?.total_payin ?? d?.totalPayin ?? 0)
  const totalPayout = Number(d?.total_payout ?? d?.totalPayout ?? 0)
  const todayPayin = Number(d?.today_payin ?? d?.todayPayin ?? 0)
  const todayPayout = Number(d?.today_payout ?? d?.todayPayout ?? 0)
  const successRate = totalPayin > 0 ? Math.min(100, Math.round((Number(d?.successfulPayin ?? d?.successful_payin ?? totalPayin) / totalPayin) * 100)) : 0

  const stats = [
    { label: 'Total Payin', value: loading ? '—' : formatCurrency(totalPayin), icon: <TrendingDown size={20} />, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Total Payout', value: loading ? '—' : formatCurrency(totalPayout), icon: <TrendingUp size={20} />, iconBg: 'bg-orange-50', iconColor: 'text-orange-500' },
    { label: "Today's Payin", value: loading ? '—' : formatCurrency(todayPayin), icon: <Activity size={20} />, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: "Today's Payout", value: loading ? '—' : formatCurrency(todayPayout), icon: <ArrowUpCircle size={20} />, iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0] || user?.user_name} 👋</h1>
          <p className="page-subtitle">Here's your account overview</p>
        </div>
        <button onClick={() => { setRefreshing(true); fetchAll() }}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 transition-all">
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Balance hero card */}
      <div className="bg-gradient-to-r from-[#1A2744] to-[#2D4A8A] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-24 translate-x-20" />
        <div className="absolute bottom-0 right-20 w-40 h-40 bg-[#D4AF37]/10 rounded-full translate-y-16" />
        <div className="relative z-10">
          <div className={`grid grid-cols-1 gap-6 ${rollingReserveBalance > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {/* Wallet Balance */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={14} className="text-blue-300" />
                <p className="text-blue-200 text-sm font-medium">Wallet Balance</p>
              </div>
              {loading
                ? <Skeleton variant="rectangular" width={180} height={36} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />
                : <p className="text-3xl font-bold tracking-tight">{formatCurrency(walletBalance)}</p>
              }
            </div>
            {/* Settlement Balance */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BadgeCheck size={14} className="text-[#D4AF37]" />
                <p className="text-[#D4AF37]/80 text-sm font-medium">Settlement Balance</p>
              </div>
              {loading
                ? <Skeleton variant="rectangular" width={180} height={36} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />
                : <p className="text-3xl font-bold tracking-tight text-[#D4AF37]">{formatCurrency(settlementBalance)}</p>
              }
            </div>
            {/* Rolling Reserve — only shown when funds are held in reserve */}
            {rollingReserveBalance > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck size={14} className="text-amber-400" />
                  <p className="text-amber-200/80 text-sm font-medium">Rolling Reserve</p>
                </div>
                <p className="text-3xl font-bold tracking-tight text-amber-300">{formatCurrency(rollingReserveBalance)}</p>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center gap-3 max-w-xs">
            <span className="text-xs text-blue-200 whitespace-nowrap">Success Rate</span>
            <LinearProgress variant="determinate" value={successRate}
              sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.15)', '& .MuiLinearProgress-bar': { bgcolor: '#D4AF37' }, height: 6, borderRadius: 3 }} />
            <span className="text-xs font-bold text-[#D4AF37]">{successRate}%</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => loading ? <div key={s.label} className="stat-card"><Skeleton height={100} /></div> : <StatCard key={s.label} {...s} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Transaction History</h3>
              <p className="text-xs text-slate-400">Payin vs Payout</p>
            </div>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Days</InputLabel>
              <Select value={days} label="Days" onChange={(e) => setDays(Number(e.target.value))}>
                <MenuItem value={7}>7 days</MenuItem>
                <MenuItem value={14}>14 days</MenuItem>
                <MenuItem value={30}>30 days</MenuItem>
              </Select>
            </FormControl>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData as Record<string, unknown>[]}>
              <defs>
                <linearGradient id="uGrad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="uGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="payin" name="Payin" stroke="#10B981" strokeWidth={2} fill="url(#uGrad1)" />
              <Area type="monotone" dataKey="payout" name="Payout" stroke="#3B82F6" strokeWidth={2} fill="url(#uGrad2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Daily Transactions</h3>
          <p className="text-xs text-slate-400 mb-4">Count per day</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData as Record<string, unknown>[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} />
              <Bar dataKey="count" name="Transactions" fill="#1A2744" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
