import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play, Copy, Check, RefreshCw, CheckCircle2, XCircle, FlaskConical, Radio, Wand2, ChevronDown, ChevronRight, Send
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { getMenuItems } from '../../utils/menuItems';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';

/**
 * API Playground — lets a merchant try every merchant API from the dashboard.
 *
 * Payin / Payout creation always go to the SANDBOX (/api/sandbox/*): no gateway,
 * no money, no balance change. Status checks can target sandbox or live; balance
 * check is live (read-only).
 */

const LIVE_BASE = 'https://dashboard.accuzpay.in/api';

type Mode = 'sandbox' | 'live';
type EndpointId = 'payin' | 'payout' | 'payin_status' | 'payout_status' | 'balance';

interface EndpointDef {
  id: EndpointId;
  title: string;
  method: 'GET' | 'POST';
  livePath: string;
  sandboxPath?: string;
  modes: Mode[];
  hasBody: boolean;
  needsRef: boolean;
  description: string;
}

const ENDPOINTS: EndpointDef[] = [
  {
    id: 'payin', title: 'Create Payin', method: 'POST', livePath: '/payments/payin', sandboxPath: '/sandbox/payin',
    modes: ['sandbox'], hasBody: true, needsRef: false,
    description: 'Creates a UPI payment intent. In the sandbox the intent is not payable and the result is simulated.'
  },
  {
    id: 'payout', title: 'Create Payout', method: 'POST', livePath: '/payments/payout', sandboxPath: '/sandbox/payout',
    modes: ['sandbox'], hasBody: true, needsRef: false,
    description: 'Sends money to a bank account. In the sandbox no money moves and your balance is not touched.'
  },
  {
    id: 'payin_status', title: 'Payin Status', method: 'GET', livePath: '/payments/payin/transaction/{reference_id}',
    sandboxPath: '/sandbox/payin/transaction/{reference_id}', modes: ['sandbox', 'live'], hasBody: false, needsRef: true,
    description: 'Looks up a payin by your reference_id.'
  },
  {
    id: 'payout_status', title: 'Payout Status', method: 'GET', livePath: '/payments/payout/transaction/{reference_id}',
    sandboxPath: '/sandbox/payout/transaction/{reference_id}', modes: ['sandbox', 'live'], hasBody: false, needsRef: true,
    description: 'Looks up a payout by your reference_id.'
  },
  {
    id: 'balance', title: 'Balance Check', method: 'GET', livePath: '/payments/balanceCheck',
    modes: ['live'], hasBody: false, needsRef: false,
    description: 'Returns your current wallet, settlement and direct bank payout balances (read-only).'
  }
];

const newRef = (prefix: string) => `${prefix}${Date.now()}${Math.floor(Math.random() * 90 + 10)}`;

const samplePayin = () => ({
  order_amount: 100,
  name: 'John Doe',
  email: 'john@example.com',
  phone: '9876543210',
  reference_id: newRef('TESTPI'),
  address: {
    line1: '123 Main Street',
    line2: 'Apt 4B',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'India'
  }
});

const samplePayout = () => ({
  amount: '100',
  account_number: '1234567890',
  account_ifsc: 'SBIN0001234',
  bank_name: 'State Bank of India',
  beneficiary_name: 'John Doe',
  request_type: 'IMPS',
  reference_id: newRef('TESTPO')
});

interface ApiResult {
  status: number | null;
  ms: number;
  data: unknown;
  error?: string;
}

interface LiveCheck { name: string; passed: boolean; detail: string; }

interface SandboxTxn {
  _id: string;
  type: 'payin' | 'payout';
  reference_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  requested_outcome: string;
  utr: string | null;
  createdAt: string;
  finalized_at: string | null;
  callback?: {
    url: string | null;
    delivered: boolean;
    payload: unknown;
    attempts: { attempt: number; status_code: number | null; error: string | null; response_snippet: string | null; latency_ms: number; at: string }[];
  };
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-yellow-100 text-yellow-800'
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[s] || 'bg-gray-100 text-gray-700'}`}>{s}</span>;
};

const callbackBadge = (t: SandboxTxn) => {
  if (t.status === 'pending' || t.status === 'processing') return <span className="text-xs text-gray-400">waiting</span>;
  const cb = t.callback;
  if (!cb || (!cb.url && !cb.attempts?.length)) {
    return cb?.payload
      ? <span className="text-xs text-gray-500">no webhook URL</span>
      : <span className="text-xs text-gray-400">sending…</span>;
  }
  if (cb.delivered) return <span className="text-xs text-green-700 font-medium">delivered</span>;
  return <span className="text-xs text-red-600 font-medium">failed</span>;
};

const ApiPlayground: React.FC = () => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<EndpointId>('payin');
  const [mode, setMode] = useState<Mode>('sandbox');
  const [bodies, setBodies] = useState<Record<'payin' | 'payout', string>>({
    payin: JSON.stringify(samplePayin(), null, 2),
    payout: JSON.stringify(samplePayout(), null, 2)
  });
  const [outcome, setOutcome] = useState<'success' | 'failed' | 'pending'>('success');
  const [refInput, setRefInput] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [txns, setTxns] = useState<SandboxTxn[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const endpoint = useMemo(() => ENDPOINTS.find((e) => e.id === selected)!, [selected]);
  const effectiveMode: Mode = endpoint.modes.includes(mode) ? mode : endpoint.modes[0];

  const resolvedPath = (m: Mode) => {
    const p = m === 'sandbox' && endpoint.sandboxPath ? endpoint.sandboxPath : endpoint.livePath;
    return p.replace('{reference_id}', encodeURIComponent(refInput.trim() || '{reference_id}'));
  };

  const loadTxns = useCallback(async () => {
    try {
      const res = await api.get('/sandbox/transactions', { params: { limit: 25 } });
      if (res.data?.success) setTxns(res.data.data);
    } catch {
      /* table is best-effort */
    }
  }, []);

  useEffect(() => { loadTxns(); }, [loadTxns]);

  // Poll while anything is still settling (status or callback delivery).
  useEffect(() => {
    const settling = txns.some((t) =>
      ((t.status === 'pending' || t.status === 'processing') && t.requested_outcome !== 'pending') ||
      ((t.status === 'success' || t.status === 'failed') && !t.callback?.payload));
    if (settling && pollRef.current === null) {
      pollRef.current = window.setInterval(loadTxns, 3000);
    } else if (!settling && pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [txns, loadTxns]);

  useEffect(() => () => { if (pollRef.current !== null) window.clearInterval(pollRef.current); }, []);

  const currentBody = endpoint.hasBody ? bodies[selected as 'payin' | 'payout'] : '';

  const parseBody = (): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(currentBody);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Body must be a JSON object');
      return parsed;
    } catch (e) {
      toast.error(`Invalid JSON: ${(e as Error).message}`);
      return null;
    }
  };

  const send = async () => {
    if (endpoint.needsRef && !refInput.trim()) {
      toast.error('Enter a reference_id');
      return;
    }
    let payload: Record<string, unknown> | undefined;
    if (endpoint.hasBody) {
      const parsed = parseBody();
      if (!parsed) return;
      payload = { ...parsed, sandbox_outcome: outcome };
    }
    setSending(true);
    setResult(null);
    const started = performance.now();
    try {
      const res = await api.request({ method: endpoint.method, url: resolvedPath(effectiveMode), data: payload });
      setResult({ status: res.status, ms: Math.round(performance.now() - started), data: res.data });
    } catch (err: unknown) {
      const e = err as { response?: { status: number; data: unknown }; message: string };
      setResult({
        status: e.response?.status ?? null,
        ms: Math.round(performance.now() - started),
        data: e.response?.data ?? null,
        error: e.response ? undefined : e.message
      });
    } finally {
      setSending(false);
      if (endpoint.hasBody) {
        loadTxns();
        // fresh reference so the next send doesn't hit "already exists"
        try {
          const obj = JSON.parse(currentBody);
          obj.reference_id = newRef(selected === 'payin' ? 'TESTPI' : 'TESTPO');
          setBodies((b) => ({ ...b, [selected]: JSON.stringify(obj, null, 2) }));
        } catch { /* leave as-is */ }
      }
    }
  };

  const resetBody = () => {
    if (selected === 'payin') setBodies((b) => ({ ...b, payin: JSON.stringify(samplePayin(), null, 2) }));
    if (selected === 'payout') setBodies((b) => ({ ...b, payout: JSON.stringify(samplePayout(), null, 2) }));
  };

  const curl = useMemo(() => {
    const url = `${LIVE_BASE}${endpoint.livePath.replace('{reference_id}', refInput.trim() || '{reference_id}')}`;
    const lines = [`curl --location${endpoint.method === 'GET' ? '' : " --request POST"} '${url}' \\`, `--header 'Authorization: YOUR_JWT_TOKEN'`];
    if (endpoint.hasBody) {
      lines[lines.length - 1] += ' \\';
      lines.push(`--header 'Content-Type: application/json' \\`);
      lines.push(`--data '${currentBody}'`);
    }
    return lines.join('\n');
  }, [endpoint, refInput, currentBody]);

  const copyCurl = () => {
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const actOnTxn = async (t: SandboxTxn, action: 'success' | 'failed' | 'callback') => {
    try {
      if (action === 'callback') {
        await api.post(`/sandbox/${t.type}/${encodeURIComponent(t.reference_id)}/callback`);
        toast.success('Callback re-sent');
      } else {
        await api.post(`/sandbox/${t.type}/${encodeURIComponent(t.reference_id)}/simulate`, { outcome: action });
        toast.success(`Marked ${action}`);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Action failed');
    } finally {
      loadTxns();
    }
  };

  const checkStatus = (t: SandboxTxn) => {
    setSelected(t.type === 'payin' ? 'payin_status' : 'payout_status');
    setMode('sandbox');
    setRefInput(t.reference_id);
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sandboxInfo = (result?.data as { sandbox?: { live_checks?: LiveCheck[]; would_pass_live?: boolean; charges_preview?: Record<string, number> | null; callback_url?: string | null; finalizes_in_ms?: number | null } } | null)?.sandbox;
  const sandboxDetails = sandboxInfo && typeof sandboxInfo === 'object' ? sandboxInfo : null;

  return (
    <DashboardLayout menuItems={getMenuItems(user?.user_type || 'user')} title="API Playground">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 flex gap-3">
          <FlaskConical className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Payin and payout calls here run in the sandbox.</p>
            <p>
              No gateway is called, no money moves and your balances, reports and settlement are not affected.
              Reference IDs and UTRs are marked <span className="font-mono">SANDBOX</span>, and the test callback sent to your
              webhook carries <span className="font-mono">"sandbox": true</span> and the header{' '}
              <span className="font-mono">X-AccuzPay-Sandbox: true</span>. Status and balance checks marked LIVE read your real data.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Endpoint list */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-card border border-gray-200 p-3 h-fit">
            <p className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">Endpoints</p>
            <ul className="space-y-1">
              {ENDPOINTS.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => { setSelected(e.id); setResult(null); }}
                    className={`w-full text-left px-2 py-2 rounded-md flex items-center gap-2 text-sm ${selected === e.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${e.method === 'POST' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{e.method}</span>
                    <span className="flex-1">{e.title}</span>
                    {e.modes.length === 1 && (
                      <span className={`text-[10px] font-semibold ${e.modes[0] === 'sandbox' ? 'text-amber-600' : 'text-gray-500'}`}>
                        {e.modes[0] === 'sandbox' ? 'SANDBOX' : 'LIVE'}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Request + response */}
          <div className="lg:col-span-9 space-y-6">
            <div className="bg-white rounded-lg shadow-card border border-gray-200 p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">{endpoint.title}</h2>
                  <p className="text-sm text-gray-500">{endpoint.description}</p>
                </div>
                {endpoint.modes.length > 1 && (
                  <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-sm">
                    {endpoint.modes.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`px-3 py-1.5 flex items-center gap-1 ${effectiveMode === m ? (m === 'sandbox' ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white') : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        {m === 'sandbox' ? <FlaskConical className="h-3.5 w-3.5" /> : <Radio className="h-3.5 w-3.5" />}
                        {m === 'sandbox' ? 'Sandbox' : 'Live'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 font-mono text-sm overflow-x-auto">
                <span className={`font-bold ${endpoint.method === 'POST' ? 'text-blue-700' : 'text-green-700'}`}>{endpoint.method}</span>
                <span className="text-gray-700 whitespace-nowrap">/api{resolvedPath(effectiveMode)}</span>
                <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded ${effectiveMode === 'sandbox' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {effectiveMode === 'sandbox' ? 'SANDBOX' : 'LIVE · READ-ONLY'}
                </span>
              </div>

              {endpoint.needsRef && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">reference_id</label>
                  <input
                    value={refInput}
                    onChange={(e) => setRefInput(e.target.value)}
                    placeholder="e.g. TESTPI1731500000000"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
                  />
                </div>
              )}

              {endpoint.hasBody && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Request body (JSON)</label>
                      <button onClick={resetBody} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                        <Wand2 className="h-3.5 w-3.5" /> Reset sample + new reference_id
                      </button>
                    </div>
                    <textarea
                      value={currentBody}
                      onChange={(e) => setBodies((b) => ({ ...b, [selected]: e.target.value }))}
                      spellCheck={false}
                      rows={14}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm font-mono"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Simulated result:</span>
                    {(['success', 'failed', 'pending'] as const).map((o) => (
                      <label key={o} className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
                        <input type="radio" name="outcome" checked={outcome === o} onChange={() => setOutcome(o)} className="text-indigo-600 focus:ring-indigo-500" />
                        {o}
                      </label>
                    ))}
                    <span className="text-xs text-gray-500">
                      {outcome === 'pending' ? 'Stays pending until you resolve it below.' : 'Applied ~5s after the request, then the callback is sent.'}
                    </span>
                  </div>
                </>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={send}
                  disabled={sending}
                  className="inline-flex items-center gap-2 py-2 px-4 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
                >
                  {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {sending ? 'Sending…' : 'Send request'}
                </button>
                <button
                  onClick={copyCurl}
                  className="inline-flex items-center gap-2 py-2 px-4 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  Copy live cURL
                </button>
              </div>
            </div>

            {result && (
              <div className="bg-white rounded-lg shadow-card border border-gray-200 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-gray-800">Response</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${result.status && result.status < 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {result.status ?? 'NETWORK ERROR'}
                  </span>
                  <span className="text-xs text-gray-500">{result.ms} ms</span>
                </div>
                {result.error && <p className="text-sm text-red-600">{result.error}</p>}
                <pre className="bg-gray-900 text-green-200 text-xs rounded-md p-4 overflow-x-auto max-h-96">{JSON.stringify(result.data, null, 2)}</pre>

                {sandboxDetails && sandboxDetails.live_checks && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-800">Would this pass on the live API?</h4>
                      {sandboxDetails.would_pass_live
                        ? <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">Yes</span>
                        : <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded">Not yet</span>}
                    </div>
                    <ul className="space-y-1">
                      {sandboxDetails.live_checks.map((c) => (
                        <li key={c.name} className="flex items-start gap-2 text-sm">
                          {c.passed ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" /> : <XCircle className="h-4 w-4 text-red-500 mt-0.5" />}
                          <span className="font-mono text-gray-700">{c.name}</span>
                          <span className="text-gray-500">— {c.detail}</span>
                        </li>
                      ))}
                    </ul>
                    {sandboxDetails.charges_preview && (
                      <p className="text-sm text-gray-600">
                        Charges on live: admin {sandboxDetails.charges_preview.admin_charge}, GST {sandboxDetails.charges_preview.gst_amount},
                        platform fee {sandboxDetails.charges_preview.platform_fee} → <strong>total {sandboxDetails.charges_preview.total_charges}</strong>
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      Test callback goes to:{' '}
                      {sandboxDetails.callback_url
                        ? <span className="font-mono">{sandboxDetails.callback_url}</span>
                        : <span className="text-red-600">no webhook URL configured — set one in Developer Settings</span>}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sandbox transactions */}
        <div className="bg-white rounded-lg shadow-card border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-semibold text-gray-800">Sandbox transactions</h3>
              <p className="text-xs text-gray-500">Your last 25 sandbox calls. Kept for 7 days. Never shown in live reports.</p>
            </div>
            <button onClick={loadTxns} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left w-6" />
                  <th className="px-4 py-2 text-left">Reference ID</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">UTR</th>
                  <th className="px-4 py-2 text-left">Callback</th>
                  <th className="px-4 py-2 text-left">Created</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {txns.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-400">No sandbox calls yet. Send a payin or payout above.</td></tr>
                )}
                {txns.map((t) => {
                  const open = expanded === t._id;
                  const terminal = t.status === 'success' || t.status === 'failed';
                  return (
                    <React.Fragment key={t._id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <button onClick={() => setExpanded(open ? null : t._id)} className="text-gray-400 hover:text-gray-600">
                            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-2 font-mono">{t.reference_id}</td>
                        <td className="px-4 py-2 capitalize">{t.type}</td>
                        <td className="px-4 py-2 text-right">{t.amount}</td>
                        <td className="px-4 py-2">{statusBadge(t.status)}</td>
                        <td className="px-4 py-2 font-mono text-xs">{t.utr || '—'}</td>
                        <td className="px-4 py-2">{callbackBadge(t)}</td>
                        <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{new Date(t.createdAt).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 whitespace-nowrap space-x-2">
                          <button onClick={() => checkStatus(t)} className="text-xs text-indigo-600 hover:underline">Status</button>
                          {!terminal && (
                            <>
                              <button onClick={() => actOnTxn(t, 'success')} className="text-xs text-green-700 hover:underline">Mark success</button>
                              <button onClick={() => actOnTxn(t, 'failed')} className="text-xs text-red-600 hover:underline">Mark failed</button>
                            </>
                          )}
                          {terminal && (
                            <button onClick={() => actOnTxn(t, 'callback')} className="text-xs text-gray-700 hover:underline inline-flex items-center gap-1">
                              <Send className="h-3 w-3" /> Resend callback
                            </button>
                          )}
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-gray-50">
                          <td colSpan={9} className="px-6 py-4 space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">Callback payload</p>
                              <pre className="bg-gray-900 text-green-200 text-xs rounded-md p-3 overflow-x-auto">
                                {t.callback?.payload ? JSON.stringify(t.callback.payload, null, 2) : 'Not sent yet'}
                              </pre>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">
                                Delivery attempts {t.callback?.url ? <span className="font-mono font-normal">→ {t.callback.url}</span> : null}
                              </p>
                              {t.callback?.attempts?.length ? (
                                <ul className="text-xs space-y-1">
                                  {t.callback.attempts.map((a, i) => (
                                    <li key={i} className="font-mono">
                                      #{a.attempt} · {a.status_code ?? 'no response'} · {a.latency_ms} ms
                                      {a.error ? <span className="text-red-600"> · {a.error}</span> : null}
                                      {a.response_snippet ? <span className="text-gray-500"> · {a.response_snippet}</span> : null}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-gray-500">{t.callback?.payload && !t.callback?.url ? 'No webhook URL configured in Developer Settings.' : 'None yet.'}</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ApiPlayground;
