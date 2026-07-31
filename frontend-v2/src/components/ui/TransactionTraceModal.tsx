import { useEffect, useState, type ReactNode } from 'react'
import { Dialog, DialogTitle, DialogContent, Chip, IconButton } from '@mui/material'
import { X, CheckCircle, XCircle, Clock, Info, ChevronDown, ChevronRight, Activity } from 'lucide-react'
import api from '@/utils/axios'

interface TraceHttp {
  method?: string | null
  url?: string | null
  status_code?: number | null
}

interface TraceEvent {
  _id: string
  reference_id: string
  trace_type: 'payin' | 'payout'
  stage: string
  status: 'ok' | 'pending' | 'failed' | 'info'
  source: string
  gateway_name?: string | null
  http?: TraceHttp
  latency_ms?: number | null
  attempt?: number | null
  detail?: string | null
  payload?: unknown
  error?: string | null
  ts: string
}

interface TraceSummary {
  reference_id: string
  type: 'payin' | 'payout' | null
  status: string | null
  amount: number | null
  gateway_name: string | null
  utr: string | null
  created_at: string | null
  updated_at: string | null
}

interface TraceResponse {
  success: boolean
  reference_id: string
  type: 'payin' | 'payout' | null
  summary: TraceSummary
  event_count: number
  events: TraceEvent[]
}

interface Props {
  referenceId: string | null
  open: boolean
  onClose: () => void
}

const statusStyles: Record<TraceEvent['status'], { dot: string; icon: ReactNode; text: string }> = {
  ok: { dot: 'bg-green-500', icon: <CheckCircle className="h-4 w-4 text-green-600" />, text: 'text-green-700' },
  failed: { dot: 'bg-red-500', icon: <XCircle className="h-4 w-4 text-red-600" />, text: 'text-red-700' },
  pending: { dot: 'bg-amber-500', icon: <Clock className="h-4 w-4 text-amber-600" />, text: 'text-amber-700' },
  info: { dot: 'bg-blue-500', icon: <Info className="h-4 w-4 text-blue-600" />, text: 'text-blue-700' },
}

const fmtTime = (ts: string) => {
  try {
    return new Date(ts).toLocaleString(undefined, {
      hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short',
    })
  } catch {
    return ts
  }
}

const gapLabel = (fromTs: string, toTs: string): string | null => {
  const ms = new Date(toTs).getTime() - new Date(fromTs).getTime()
  if (isNaN(ms) || ms < 1500) return null
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem ? `${m}m ${rem}s` : `${m}m`
}

function TraceRow({ event, prev }: { event: TraceEvent; prev?: TraceEvent }) {
  const [expanded, setExpanded] = useState(false)
  const style = statusStyles[event.status] || statusStyles.info
  const gap = prev ? gapLabel(prev.ts, event.ts) : null
  const hasPayload = event.payload != null && Object.keys(event.payload as object).length > 0

  return (
    <>
      {gap && (
        <div className="flex items-center gap-2 pl-[7px] py-1">
          <div className="w-px h-4 border-l border-dashed border-slate-300" />
          <span className="text-[11px] text-slate-400 italic">⏱ {gap} elapsed</span>
        </div>
      )}
      <div className="relative flex gap-3 pb-4">
        <div className="flex flex-col items-center">
          <span className={`mt-1 h-3.5 w-3.5 rounded-full ring-4 ring-white ${style.dot}`} />
          <span className="flex-1 w-px bg-slate-200" />
        </div>
        <div className="flex-1 -mt-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {style.icon}
            <span className="font-semibold text-sm text-slate-900">{event.stage.replace(/_/g, ' ')}</span>
            {event.attempt != null && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">attempt {event.attempt}</span>
            )}
            {event.gateway_name && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{event.gateway_name}</span>
            )}
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-400 border border-slate-100">{event.source}</span>
            <span className="ml-auto text-[11px] text-slate-400 whitespace-nowrap">{fmtTime(event.ts)}</span>
          </div>

          {event.detail && <p className="text-sm text-slate-600 mt-0.5">{event.detail}</p>}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-500">
            {event.http?.method && (
              <span className="font-mono">
                {event.http.method} {event.http.url}
                {event.http.status_code != null && <span className={style.text}> → {event.http.status_code}</span>}
              </span>
            )}
            {event.latency_ms != null && <span>{event.latency_ms}ms</span>}
          </div>

          {event.error && (
            <p className="text-xs text-red-600 mt-1 bg-red-50 border border-red-100 rounded px-2 py-1 break-all">{event.error}</p>
          )}

          {hasPayload && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700"
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              payload
            </button>
          )}
          {expanded && hasPayload && (
            <pre className="mt-1 text-[11px] bg-slate-50 border border-slate-100 rounded p-2 overflow-x-auto text-slate-700 max-h-56">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </>
  )
}

export default function TransactionTraceModal({ referenceId, open, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TraceResponse | null>(null)

  useEffect(() => {
    if (!open || !referenceId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setData(null)
    api
      .get(`/admin/transactions/${referenceId}/trace`)
      .then((res) => {
        if (!cancelled) setData(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message || 'Failed to load trace')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, referenceId])

  const summary = data?.summary

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              <span>Transaction Journey</span>
              {data?.type && (
                <Chip label={data.type.toUpperCase()} size="small"
                  sx={{ fontSize: '0.6rem', height: 18, borderRadius: '5px', bgcolor: '#EEF2FF', color: '#4338CA', fontWeight: 600 }} />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono break-all font-normal">{referenceId}</p>
          </div>
          <IconButton size="small" onClick={onClose} sx={{ color: '#94A3B8', mt: -0.5 }}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }} dividers>
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs">
            <div>
              <p className="text-slate-400">Status</p>
              <p className="font-medium text-slate-800">{summary.status ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-400">Amount</p>
              <p className="font-medium text-slate-800">{summary.amount != null ? `₹${summary.amount}` : '—'}</p>
            </div>
            <div>
              <p className="text-slate-400">Gateway</p>
              <p className="font-medium text-slate-800">{summary.gateway_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-400">UTR</p>
              <p className="font-medium text-slate-800 break-all">{summary.utr ?? '—'}</p>
            </div>
          </div>
        )}

        <div className="p-5 max-h-[55vh] overflow-y-auto">
          {loading && <p className="text-sm text-slate-500 text-center py-8">Loading journey…</p>}
          {error && <p className="text-sm text-red-600 text-center py-8">{error}</p>}
          {!loading && !error && data && data.events.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No trace events recorded for this transaction yet.</p>
          )}
          {!loading && !error && data && data.events.length > 0 && (
            <div>
              {data.events.map((ev, i) => (
                <TraceRow key={ev._id || i} event={ev} prev={i > 0 ? data.events[i - 1] : undefined} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
