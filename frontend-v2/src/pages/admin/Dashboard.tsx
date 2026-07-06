import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Select, MenuItem, FormControl, InputLabel, Chip, Skeleton } from '@mui/material'
import {
  Users, Wallet, TrendingDown, TrendingUp, DollarSign, Activity,
  ArrowDownCircle, ArrowUpCircle, RefreshCw,
} from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import api from '@/utils/axios'
import { formatCurrency } from '@/utils/formatUtils'

const PIE_COLORS = ['#1A2744', '#10B981', '#D4AF37']

interface DashData {
  totalUsers: number
  totalBalance: number
  todayPayin: number
  todayPayout: number
  totalPayin: number
  totalPayout: number
  totalProfit: number
  todayProfit: number
  totalOutflow: number
  totalInflow: number
  last7DaysData: { date: string; payin: number; payout: number; profit: number }[]
  recentPayoutTransactions: unknown[]
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashData | null>(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = async () => {
    try {
      const res = await api.get('/admin/dashboard')
      // backend returns { success: true, data: { ... } }
      const payload = res.data?.data ?? res.data
      setData(payload)
    } catch { /* empty */ }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { fetchAll() }, [days])

  const d = data

  const chartData = d?.last7DaysData || []

  const stats = [
    { label: 'Total Users', value: loading ? '—' : String(d?.totalUsers ?? 0), icon: <Users size={20} />, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: 'Total Balance', value: loading ? '—' : formatCurrency(d?.totalBalance ?? 0), icon: <Wallet size={20} />, iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
    { label: "Today's Payin", value: loading ? '—' : formatCurrency(d?.todayPayin ?? 0), icon: <TrendingDown size={20} />, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: "Today's Payout", value: loading ? '—' : formatCurrency(d?.todayPayout ?? 0), icon: <TrendingUp size={20} />, iconBg: 'bg-orange-50', iconColor: 'text-orange-600' },
    { label: 'Total Payin', value: loading ? '—' : formatCurrency(d?.totalPayin ?? 0), icon: <ArrowDownCircle size={20} />, iconBg: 'bg-teal-50', iconColor: 'text-teal-600' },
    { label: 'Total Payout', value: loading ? '—' : formatCurrency(d?.totalPayout ?? 0), icon: <ArrowUpCircle size={20} />, iconBg: 'bg-red-50', iconColor: 'text-red-500' },
    { label: 'Total Profit', value: loading ? '—' : formatCurrency(d?.totalProfit ?? 0), icon: <DollarSign size={20} />, iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600' },
    { label: 'Total Inflow', value: loading ? '—' : formatCurrency(d?.totalInflow ?? 0), icon: <Activity size={20} />, iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
  ]

  const pieData = [
    { name: 'Payin', value: d?.totalPayin || 0 },
    { name: 'Payout', value: d?.totalPayout || 0 },
    { name: 'Profit', value: d?.totalProfit || 0 },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time overview of all operations</p>
        </div>
        <div className="flex items-center gap-3">
          <Chip label="Live" size="small"
            sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 600, fontSize: '0.7rem' }}
            icon={<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1.5" />} />
          <button onClick={() => { setRefreshing(true); fetchAll() }}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="stat-card">
                <Skeleton variant="rectangular" height={44} width={44} sx={{ borderRadius: 2, mb: 2 }} />
                <Skeleton width="60%" sx={{ mb: 0.5 }} />
                <Skeleton width="80%" height={32} />
              </div>
            ))
          : stats.map((s) => <StatCard key={s.label} {...s} />)
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Transaction Trend</h3>
              <p className="text-xs text-slate-400 mt-0.5">Payin vs Payout over time</p>
            </div>
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>Period</InputLabel>
              <Select value={days} label="Period" onChange={(e) => setDays(Number(e.target.value))}>
                <MenuItem value={7}>7 days</MenuItem>
                <MenuItem value={14}>14 days</MenuItem>
                <MenuItem value={30}>30 days</MenuItem>
              </Select>
            </FormControl>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gPayin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPayout" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}
                formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="payin" name="Payin" stroke="#10B981" strokeWidth={2} fill="url(#gPayin)" />
              <Area type="monotone" dataKey="payout" name="Payout" stroke="#EF4444" strokeWidth={2} fill="url(#gPayout)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Fund Distribution</h3>
          <p className="text-xs text-slate-400 mb-3">Payin / Payout / Profit</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                dataKey="value" paddingAngle={3} stroke="none">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8}
                formatter={(v) => <span style={{ fontSize: 12, color: '#64748B' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Payin / Payout Daily Trend</h3>
        <p className="text-xs text-slate-400 mb-4">Volume per day</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}
              formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="payin" name="Payin" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Bar dataKey="payout" name="Payout" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Profit", value: formatCurrency(d?.todayProfit ?? 0), color: 'text-emerald-600' },
          { label: 'Total Outflow', value: formatCurrency(d?.totalOutflow ?? 0), color: 'text-red-500' },
          { label: 'Total Inflow', value: formatCurrency(d?.totalInflow ?? 0), color: 'text-blue-600' },
          { label: 'Total Balance', value: formatCurrency(d?.totalBalance ?? 0), color: 'text-purple-600' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-xs text-slate-500 mb-1">{item.label}</p>
            <p className={`text-lg font-bold ${item.color}`}>
              {loading ? <Skeleton width={60} /> : item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
