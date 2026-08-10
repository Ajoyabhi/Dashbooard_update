import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts'
import { Select, MenuItem, FormControl, InputLabel, TextField, Skeleton, Chip } from '@mui/material'
import {
  ArrowLeft, RefreshCw, Repeat, Hash, TrendingUp, Layers,
  Sigma, Target, Wallet, BarChart3,
} from 'lucide-react'
import api from '@/utils/axios'
import { formatCurrency, formatNumber } from '@/utils/formatUtils'
import toast from 'react-hot-toast'

// ---- Types mirror the /admin/users/:userId/amount-analytics response ----
interface AmountRow { amount: number; count: number; completed: number; volume: number }
interface BandRow { label: string; min: number; max: number | null; count: number; volume: number }
interface StatusRow { status: string; count: number; volume: number }
interface HourRow { hour: number; label: string; count: number; volume: number }
interface DowRow { weekday: string; count: number; volume: number }
interface Analytics {
  totalCount: number; uniqueCount: number; totalVolume: number
  mean: number; avgTicket: number; median: number; mode: number; stddev: number
  min: number; max: number; p25: number; p75: number; p90: number; repeatRatio: number
  mostUsed: AmountRow[]; leastUsed: AmountRow[]; distribution: AmountRow[]
  histogram: BandRow[]; statusBreakdown: StatusRow[]; hourly: HourRow[]; weekday: DowRow[]
}
interface AnalyticsResponse {
  user: { id: number; name: string; user_name: string }
  filters: { startDate: string | null; endDate: string | null; status: string }
  payin: Analytics; payout: Analytics
}

type TxType = 'payin' | 'payout'

// Short amount label for dense axes/tables, e.g. 25000 -> ₹25k, 150000 -> ₹1.5L
const shortAmt = (n: number): string => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k`
  return `₹${n}`
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#10B981', pending: '#F59E0B', processing: '#3B82F6',
  failed: '#EF4444', payin_qr_generated: '#8B5CF6', unknown: '#94A3B8',
}

const TOOLTIP_STYLE = { borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }

function KpiCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}1A`, color: accent }}>{icon}</span>
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-0.5">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mb-3">{subtitle}</p>}
      {children}
    </div>
  )
}

// Ranked amount table (most/least used) with a proportional frequency bar.
function AmountTable({ rows, accent, emptyLabel }: { rows: AmountRow[]; accent: string; emptyLabel: string }) {
  const maxCount = Math.max(1, ...rows.map(r => r.count))
  if (!rows.length) return <p className="text-sm text-slate-300 py-6 text-center">{emptyLabel}</p>
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-5 text-xs font-semibold text-slate-400">{i + 1}</span>
          <span className="w-20 text-sm font-semibold text-slate-700">{formatCurrency(r.amount)}</span>
          <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(r.count / maxCount) * 100}%`, background: accent }} />
          </div>
          <span className="w-14 text-right text-xs font-medium text-slate-500">{formatNumber(r.count)}×</span>
        </div>
      ))}
    </div>
  )
}

export default function UserAnalytics() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TxType>('payin')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('all')

  const load = () => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    if (status !== 'all') params.status = status
    api.get(`/admin/users/${userId}/amount-analytics`, { params })
      .then((r) => setData(r.data.data))
      .catch((e) => toast.error(e.response?.data?.message || 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [userId])

  const accent = tab === 'payin' ? '#10B981' : '#EF4444'
  const a: Analytics | undefined = data ? data[tab] : undefined

  const statusPie = useMemo(() =>
    (a?.statusBreakdown || []).map(s => ({ name: s.status, value: s.count })), [a])

  const peakHour = useMemo(() => {
    if (!a?.hourly?.length) return null
    return a.hourly.reduce((m, h) => (h.count > m.count ? h : m), a.hourly[0])
  }, [a])
  const peakDow = useMemo(() => {
    if (!a?.weekday?.length) return null
    return a.weekday.reduce((m, d) => (d.count > m.count ? d : m), a.weekday[0])
  }, [a])

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title mb-0">Amount Analytics</h1>
            <p className="text-sm text-slate-400">
              {data ? `${data.user.name} · @${data.user.user_name}` : 'Transaction amount behaviour'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TextField type="date" size="small" label="From" InputLabelProps={{ shrink: true }}
            value={startDate} onChange={(e) => setStartDate(e.target.value)} sx={{ width: 150 }} />
          <TextField type="date" size="small" label="To" InputLabelProps={{ shrink: true }}
            value={endDate} onChange={(e) => setEndDate(e.target.value)} sx={{ width: 150 }} />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="all">All statuses</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A2744] text-white text-sm font-medium hover:bg-[#0E172A] transition-all">
            <RefreshCw size={14} /> Apply
          </button>
        </div>
      </div>

      {/* Payin / Payout switch */}
      <div className="inline-flex p-1 bg-slate-100 rounded-xl">
        {(['payin', 'payout'] as TxType[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
              tab === t ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} variant="rectangular" height={96} sx={{ borderRadius: 3 }} />)}
          </div>
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
        </div>
      ) : !a || a.totalCount === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <BarChart3 className="mx-auto text-slate-200 mb-3" size={48} />
          <p className="text-slate-400 font-medium">No {tab} transactions for this user in the selected range.</p>
        </div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard accent={accent} icon={<Hash size={16} />} label="Total Txns" value={formatNumber(a.totalCount)} sub={`${formatNumber(a.uniqueCount)} distinct amounts`} />
            <KpiCard accent={accent} icon={<Wallet size={16} />} label="Total Volume" value={formatCurrency(a.totalVolume)} sub={`Avg ${formatCurrency(a.avgTicket)}`} />
            <KpiCard accent={accent} icon={<Target size={16} />} label="Most Used Amount" value={formatCurrency(a.mode)} sub="Highest frequency" />
            <KpiCard accent={accent} icon={<TrendingUp size={16} />} label="Median Ticket" value={formatCurrency(a.median)} sub={`P25 ${shortAmt(a.p25)} · P75 ${shortAmt(a.p75)}`} />
            <KpiCard accent={accent} icon={<Layers size={16} />} label="Range" value={`${shortAmt(a.min)} – ${shortAmt(a.max)}`} sub={`P90 ${shortAmt(a.p90)}`} />
            <KpiCard accent={accent} icon={<Sigma size={16} />} label="Std Deviation" value={formatCurrency(a.stddev)} sub="Amount spread" />
            <KpiCard accent={accent} icon={<Repeat size={16} />} label="Repeat Rate" value={`${(a.repeatRatio * 100).toFixed(1)}%`} sub="Reused ticket sizes" />
            <KpiCard accent={accent} icon={<BarChart3 size={16} />} label="Peak Window" value={peakHour ? peakHour.label : '—'} sub={peakDow ? `Busiest: ${peakDow.weekday}` : undefined} />
          </div>

          {/* Frequency of amounts */}
          <Card title="Amount Frequency" subtitle="How often each distinct amount is transacted (top 25 by count)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={a.distribution} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="amount" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                  tickFormatter={shortAmt} interval={0} angle={-35} textAnchor="end" height={54} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number, _n, p: any) => [`${formatNumber(v)} txns · ${formatCurrency(p.payload.volume)}`, 'Frequency']}
                  labelFormatter={(l) => `Amount ${formatCurrency(l as number)}`} />
                <Bar dataKey="count" name="Count" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Histogram + Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card title="Distribution by Amount Band" subtitle="Transaction count grouped into rupee bands">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={a.histogram} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                      interval={0} angle={-30} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number, _n, p: any) => [`${formatNumber(v)} txns · ${formatCurrency(p.payload.volume)}`, 'Band']} />
                    <Bar dataKey="count" name="Count" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
            <Card title="Status Split" subtitle="Outcome mix">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={3} stroke="none">
                    {statusPie.map((s, i) => <Cell key={i} fill={STATUS_COLORS[s.name] || STATUS_COLORS.unknown} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `${formatNumber(v)} txns`} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ fontSize: 11, color: '#64748B', textTransform: 'capitalize' }}>{String(v).replace(/_/g, ' ')}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Most / Least used */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Most Used Amounts" subtitle="This user's go-to ticket sizes">
              <AmountTable rows={a.mostUsed} accent={accent} emptyLabel="No data" />
            </Card>
            <Card title="Least Used Amounts" subtitle="Rare / one-off amounts">
              <AmountTable rows={a.leastUsed} accent="#94A3B8" emptyLabel="No data" />
            </Card>
          </div>

          {/* Cadence: hour of day + weekday */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card title="Hour-of-Day Cadence" subtitle="When (IST) the user transacts — count per hour">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={a.hourly} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <defs>
                      <linearGradient id="gHour" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={accent} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={1} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number, _n, p: any) => [`${formatNumber(v)} txns · ${formatCurrency(p.payload.volume)}`, 'Hour']} />
                    <Area type="monotone" dataKey="count" stroke={accent} strokeWidth={2} fill="url(#gHour)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>
            <Card title="Weekday Cadence" subtitle="Count by day (IST)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={a.weekday} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="weekday" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number, _n, p: any) => [`${formatNumber(v)} txns · ${formatCurrency(p.payload.volume)}`, 'Day']} />
                  <Bar dataKey="count" name="Count" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Both-side comparison chips */}
          {data && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Payin vs Payout — at a glance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {(['payin', 'payout'] as TxType[]).map((t) => {
                  const d = data[t]
                  const c = t === 'payin' ? '#10B981' : '#EF4444'
                  return (
                    <div key={t} className="rounded-xl border border-slate-100 p-4">
                      <Chip label={t} size="small" sx={{ bgcolor: `${c}1A`, color: c, fontWeight: 700, textTransform: 'capitalize', mb: 1.5 }} />
                      <div className="space-y-1 text-slate-600">
                        <p><span className="text-slate-400">Txns:</span> {formatNumber(d.totalCount)}</p>
                        <p><span className="text-slate-400">Volume:</span> {formatCurrency(d.totalVolume)}</p>
                        <p><span className="text-slate-400">Most used:</span> {d.totalCount ? formatCurrency(d.mode) : '—'}</p>
                        <p><span className="text-slate-400">Avg ticket:</span> {formatCurrency(d.avgTicket)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
