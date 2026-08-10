import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Play } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../data/mockData';
import api from '../../utils/axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// One amount-range routing band. min/max are kept as strings for the inputs
// (blank min => 0, blank max => no upper bound / ∞).
//
// A band is either a single gateway (`mode: 'single'`, uses `gateway`) or a
// rotation pool (`mode: 'rotate'`, uses `gateways` in order + `rotateEvery`):
// each gateway processes `rotateEvery` consecutive same-amount payouts before
// handing off to the next, wrapping around.
type BandMode = 'single' | 'rotate';
interface GatewayBand {
  min: string;
  max: string;
  gateway: string;        // used when mode === 'single'
  mode: BandMode;
  gateways: string[];     // ordered pool, used when mode === 'rotate'
  rotateEvery: string;    // run-length A, used when mode === 'rotate'
}

// A blank band in single mode.
const emptyBand = (min = '', max = ''): GatewayBand => ({
  min, max, gateway: '', mode: 'single', gateways: [], rotateEvery: '3',
});

interface CallbackSettings {
  payinUrl: string;
  payinMethod: string;
  payinHeaders: string;
  payoutUrl: string;
  payoutMethod: string;
  payoutHeaders: string;
  payinMerchantName: string;
  payoutMerchantName: string;
  dummyUtrPrefix: string;
  payoutGatewayBands: GatewayBand[];
  currentPayinUrl: string;
  currentPayoutUrl: string;
  currentPayinMerchantName: string;
  currentPayoutMerchantName: string;
  currentDummyUtrPrefix: string;
  currentPayoutGatewayBands: GatewayBand[];
}

const PAYOUT_GATEWAYS = ['BluSwap', 'MizorPay', 'DummyGateway'];

// Convert the API's stored bands (or legacy single-threshold columns) into the
// editable GatewayBand[] the UI works with. Falls back to seeding a 2-band setup
// from the legacy payout_gateway_threshold/above/below so pre-existing routing
// still shows up (and re-saves as bands).
const toBands = (d: any): GatewayBand[] => {
  const raw = d?.payout_gateway_bands;
  let arr: any[] | null = null;
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === 'string' && raw.trim()) {
    try { const p = JSON.parse(raw); if (Array.isArray(p)) arr = p; } catch { /* ignore */ }
  }
  if (arr && arr.length) {
    return arr.map((b) => {
      const min = b?.min === null || b?.min === undefined ? '' : String(b.min);
      const max = b?.max === null || b?.max === undefined ? '' : String(b.max);
      const pool = Array.isArray(b?.gateways) ? b.gateways.filter(Boolean) : [];
      if (pool.length >= 2) {
        return { min, max, gateway: '', mode: 'rotate' as BandMode, gateways: pool, rotateEvery: String(b?.rotateEvery || 1) };
      }
      return { min, max, gateway: b?.gateway || pool[0] || '', mode: 'single' as BandMode, gateways: [], rotateEvery: '3' };
    });
  }
  // Legacy single-threshold fallback -> two bands.
  const th = d?.payout_gateway_threshold;
  if (th !== null && th !== undefined && String(th) !== '' && d?.payout_gateway_above && d?.payout_gateway_below) {
    return [
      { ...emptyBand('', String(th)), gateway: d.payout_gateway_below },
      { ...emptyBand(String(th), ''), gateway: d.payout_gateway_above }
    ];
  }
  return [];
};

interface GatewayStat {
  gateway: string;
  total_amount: number;
  total_count: number;
  completed_amount: number;
  completed_count: number;
}

export default function UserCallbacks() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<CallbackSettings>({
    payinUrl: '',
    payinMethod: 'POST',
    payinHeaders: '',
    payoutUrl: '',
    payoutMethod: 'POST',
    payoutHeaders: '',
    payinMerchantName: '',
    payoutMerchantName: '',
    dummyUtrPrefix: '',
    payoutGatewayBands: [],
    currentPayinUrl: '',
    currentPayoutUrl: '',
    currentPayinMerchantName: '',
    currentPayoutMerchantName: '',
    currentDummyUtrPrefix: '',
    currentPayoutGatewayBands: []
  });

  const [gatewayStats, setGatewayStats] = useState<GatewayStat[]>([]);

  const [testStatus, setTestStatus] = useState<{
    payin: 'idle' | 'loading' | 'success' | 'error';
    payout: 'idle' | 'loading' | 'success' | 'error';
  }>({
    payin: 'idle',
    payout: 'idle'
  });

  // Fetch callback details when component mounts
  useEffect(() => {
    const fetchCallbackDetails = async () => {
      try {
        const response = await api.get(`/admin/users/${userId}/callback`);
        if (response.data.success) {
          const d = response.data.data;
          const { payin_callback, payout_callback, payin_merchant_name, payout_merchant_name, dummy_utr_prefix } = d;
          const bands = toBands(d);
          setSettings(prev => ({
            ...prev,
            payinUrl: '',
            payoutUrl: '',
            payinMerchantName: '',
            payoutMerchantName: '',
            dummyUtrPrefix: dummy_utr_prefix || '',
            payoutGatewayBands: bands,
            currentPayinUrl: payin_callback || '',
            currentPayoutUrl: payout_callback || '',
            currentPayinMerchantName: payin_merchant_name || '',
            currentPayoutMerchantName: payout_merchant_name || '',
            currentDummyUtrPrefix: dummy_utr_prefix || '',
            currentPayoutGatewayBands: bands
          }));
        } else {
          toast.error('Failed to fetch callback details');
        }
      } catch (error) {
        console.error('Error fetching callback details:', error);
        toast.error('Error fetching callback details');
      }
    };

    const fetchGatewayStats = async () => {
      try {
        const response = await api.get(`/admin/users/${userId}/payout-gateway-stats`);
        if (response.data.success) {
          setGatewayStats(response.data.data.gateways || []);
        }
      } catch (error) {
        console.error('Error fetching payout gateway stats:', error);
      }
    };

    fetchCallbackDetails();
    fetchGatewayStats();
  }, [userId]);

  const money = (n: number) =>
    '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Saving callback settings:', settings);
  };

  const testCallback = async (type: 'payin' | 'payout') => {
    setTestStatus(prev => ({ ...prev, [type]: 'loading' }));

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTestStatus(prev => ({ ...prev, [type]: 'success' }));

      // Reset status after 3 seconds
      setTimeout(() => {
        setTestStatus(prev => ({ ...prev, [type]: 'idle' }));
      }, 3000);
    } catch (error) {
      setTestStatus(prev => ({ ...prev, [type]: 'error' }));
    }
  };

  const handlePayinCallback = async () => {
    try {
      const response = await api.post(`/admin/users/${userId}/callback/payin`, settings);
      if (response.data.success) {
        // Reflect the authoritative record — fields the admin left blank were
        // preserved server-side, so read the current values back from the response
        // instead of the (possibly empty) form inputs.
        const d = response.data.data || {};
        setSettings(prev => ({
          ...prev,
          currentPayinUrl: d.payin_callback ?? prev.currentPayinUrl,
          currentPayinMerchantName: d.payin_merchant_name ?? prev.currentPayinMerchantName,
          payinUrl: '',
          payinMerchantName: ''
        }));
        toast.success('Payin Callback updated successfully');
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error updating payin callback:', error);
    }
  };

  // A row is "filled" (worth keeping/validating) once it has any gateway
  // configured or a min/max set; min/max may be blank (0 / ∞).
  const bandFilled = (b: GatewayBand) =>
    b.min !== '' || b.max !== '' ||
    (b.mode === 'rotate' ? b.gateways.some(Boolean) : !!b.gateway);

  // Drop fully-empty rows, keep the admin's order. Emit the same clean shapes the
  // server's validateBands normalises to: single -> {min,max,gateway},
  // rotation -> {min,max,gateways,rotateEvery}.
  const cleanBands = (bands: GatewayBand[]) =>
    bands.filter(bandFilled).map((b) => {
      const min = b.min === '' ? 0 : Number(b.min);
      const max = b.max === '' ? null : Number(b.max);
      if (b.mode === 'rotate') {
        return { min, max, gateways: b.gateways.filter(Boolean), rotateEvery: b.rotateEvery === '' ? 1 : Number(b.rotateEvery) };
      }
      return { min, max, gateway: b.gateway };
    });

  // Client-side validation mirroring the server's validateBands, so the admin
  // gets immediate feedback. Returns an error string, or null when OK.
  const validateBandsClient = (bands: GatewayBand[]): string | null => {
    const filled = bands.filter(bandFilled);
    for (const b of filled) {
      const min = b.min === '' ? 0 : Number(b.min);
      const max = b.max === '' ? null : Number(b.max);
      if (isNaN(min) || (max !== null && isNaN(max))) return 'Band Min/Max must be numbers.';
      if (max !== null && max <= min) return `Band Max (${max}) must be greater than Min (${min}).`;
      if (b.mode === 'rotate') {
        const pool = b.gateways.filter(Boolean);
        if (pool.length < 2) return 'A rotation band needs at least two gateways.';
        if (new Set(pool).size < 2) return 'A rotation pool must contain at least two distinct gateways.';
        const re = b.rotateEvery === '' ? 1 : Number(b.rotateEvery);
        if (!Number.isInteger(re) || re < 1) return `Rotate-every must be a whole number ≥ 1 (got ${b.rotateEvery}).`;
      } else if (!b.gateway) {
        return 'Every band needs a gateway selected.';
      }
    }
    const sorted = filled
      .map(b => ({ min: b.min === '' ? 0 : Number(b.min), max: b.max === '' ? Infinity : Number(b.max) }))
      .sort((a, z) => a.min - z.min);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].min < sorted[i - 1].max) return 'Bands must not overlap.';
    }
    return null;
  };

  const handlePayoutCallback = async () => {
    const bandError = validateBandsClient(settings.payoutGatewayBands);
    if (bandError) {
      toast.error(bandError);
      return;
    }
    try {
      const payload = { ...settings, payoutGatewayBands: cleanBands(settings.payoutGatewayBands) };
      const response = await api.post(`/admin/users/${userId}/callback/payout`, payload);
      if (response.data.success) {
        // Reflect the authoritative record — fields the admin left blank were
        // preserved server-side, so read the current values back from the response
        // instead of the (possibly empty) form inputs.
        const d = response.data.data || {};
        const bands = toBands(d);
        setSettings(prev => ({
          ...prev,
          currentPayoutUrl: d.payout_callback ?? prev.currentPayoutUrl,
          currentPayoutMerchantName: d.payout_merchant_name ?? prev.currentPayoutMerchantName,
          currentDummyUtrPrefix: d.dummy_utr_prefix ?? prev.currentDummyUtrPrefix,
          currentPayoutGatewayBands: bands,
          payoutGatewayBands: bands,
          payoutUrl: '',
          payoutMerchantName: ''
        }));
        toast.success('Payout Callback updated successfully');
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      console.error('Error updating payout callback:', error);
      toast.error(error?.response?.data?.message || 'Error updating payout callback');
    }
  };

  // Band row editing helpers.
  const updateBand = (idx: number, patch: Partial<GatewayBand>) => {
    setSettings(prev => ({
      ...prev,
      payoutGatewayBands: prev.payoutGatewayBands.map((b, i) => (i === idx ? { ...b, ...patch } : b))
    }));
  };
  const addBand = () => {
    setSettings(prev => {
      const bands = prev.payoutGatewayBands;
      // Prefill the new band's min with the previous band's max for contiguity.
      const prevMax = bands.length ? bands[bands.length - 1].max : '';
      return { ...prev, payoutGatewayBands: [...bands, emptyBand(prevMax, '')] };
    });
  };
  const removeBand = (idx: number) => {
    setSettings(prev => ({ ...prev, payoutGatewayBands: prev.payoutGatewayBands.filter((_, i) => i !== idx) }));
  };

  // Switch a band between single-gateway and rotation-pool mode, carrying over
  // the already-chosen gateway so nothing is lost on the toggle.
  const setBandMode = (idx: number, mode: BandMode) => {
    updateBand(idx, mode === 'rotate'
      ? { mode, gateways: (settings.payoutGatewayBands[idx].gateway ? [settings.payoutGatewayBands[idx].gateway] : []) }
      : { mode, gateway: settings.payoutGatewayBands[idx].gateways.filter(Boolean)[0] || '' });
  };

  // Rotation-pool slot helpers (order defines the rotation sequence).
  const updatePoolSlot = (idx: number, slot: number, value: string) =>
    updateBand(idx, { gateways: settings.payoutGatewayBands[idx].gateways.map((g, i) => (i === slot ? value : g)) });
  const addPoolSlot = (idx: number) =>
    updateBand(idx, { gateways: [...settings.payoutGatewayBands[idx].gateways, ''] });
  const removePoolSlot = (idx: number, slot: number) =>
    updateBand(idx, { gateways: settings.payoutGatewayBands[idx].gateways.filter((_, i) => i !== slot) });

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Callback Settings">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        aria-label="Toast Container"
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Callback Settings</h1>
          </div>
        </div>

        {/* Display current callback details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Callback Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-700">Payin Callback</h3>
              <p className="text-gray-600">{settings.currentPayinUrl || 'Not set'}</p>
              <p className="text-sm text-gray-500">Merchant: {settings.currentPayinMerchantName || 'Not set'}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Payout Callback</h3>
              <p className="text-gray-600">{settings.currentPayoutUrl || 'Not set'}</p>
              <p className="text-sm text-gray-500">Merchant: {settings.currentPayoutMerchantName || 'Not set'}</p>
              {(settings.currentPayoutMerchantName === 'DummyGateway' ||
                settings.currentPayoutGatewayBands.some((b) => b.gateway === 'DummyGateway' || b.gateways.includes('DummyGateway'))) && (
                <p className="text-sm text-gray-500">Dummy UTR Prefix: {settings.currentDummyUtrPrefix || 'Not set (random)'}</p>
              )}
              {settings.currentPayoutGatewayBands.length > 0 ? (
                <div className="text-sm text-gray-500">
                  <p className="font-medium">Routing (by amount):</p>
                  <ul className="list-disc ml-5">
                    {settings.currentPayoutGatewayBands.map((b, i) => (
                      <li key={i}>
                        {(b.min === '' ? '0' : b.min)} – {(b.max === '' ? '∞' : b.max)} →{' '}
                        {b.mode === 'rotate'
                          ? `${b.gateways.join(' → ')} (rotate every ${b.rotateEvery || 1})`
                          : (b.gateway || '—')}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Routing: Off (single gateway)</p>
              )}
            </div>
          </div>
        </div>

        {/* Update callback settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Update Callback Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payin Callback Form */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">Payin Callback</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Callback URL</label>
                <input
                  type="text"
                  value={settings.payinUrl}
                  onChange={(e) => setSettings({ ...settings, payinUrl: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Enter new payin callback URL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Merchant Name</label>
                <select
                  value={settings.payinMerchantName}
                  onChange={(e) => setSettings({ ...settings, payinMerchantName: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Merchant</option>
                  <option value="HDFC">HDFC</option>
                  <option value="AirPay">AirPay</option>
                  <option value="Razorpay">Razorpay</option>
                </select>
              </div>
              <button
                onClick={handlePayinCallback}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Update Payin Callback
              </button>
            </div>

            {/* Payout Callback Form */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">Payout Callback</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Callback URL</label>
                <input
                  type="text"
                  value={settings.payoutUrl}
                  onChange={(e) => setSettings({ ...settings, payoutUrl: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Enter new payout callback URL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Merchant Name</label>
                <select
                  value={settings.payoutMerchantName}
                  onChange={(e) => setSettings({ ...settings, payoutMerchantName: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Merchant</option>
                  <option value="BluSwap">BluSwap</option>
                  <option value="MizorPay">MizorPay</option>
                  <option value="DummyGateway">Dummy (Test) Gateway</option>
                </select>
              </div>
              {(
                // Show the UTR prefix whenever DummyGateway is reachable: as the
                // selected single gateway, the currently-stored single gateway (top
                // dropdown left blank = unchanged), OR any amount-range band.
                settings.payoutMerchantName === 'DummyGateway' ||
                (!settings.payoutMerchantName && settings.currentPayoutMerchantName === 'DummyGateway') ||
                settings.payoutGatewayBands.some((b) => b.gateway === 'DummyGateway' || b.gateways.includes('DummyGateway'))
              ) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Dummy UTR Prefix</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={settings.dummyUtrPrefix}
                    onChange={(e) => setSettings({ ...settings, dummyUtrPrefix: e.target.value.replace(/\D/g, '') })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="e.g. 6220133 (rest filled randomly to 12 digits)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leading digits of the test UTR. Total UTR is 12 digits; the remaining {Math.max(0, 12 - settings.dummyUtrPrefix.length)} will be random. Leave blank for a fully random UTR.
                  </p>
                </div>
              )}

              {/* Amount-range gateway routing (N tiers) */}
              <div className="border-t border-gray-200 pt-4 mt-2">
                <h4 className="font-medium text-gray-700">Amount-based Routing (optional)</h4>
                <p className="text-xs text-gray-500 mb-2">
                  Route by amount across as many ranges as you like. Each band uses <strong>Min ≤ amount &lt; Max</strong> (Min inclusive, Max exclusive). Leave a band's <strong>Min blank for 0</strong> and its <strong>Max blank for ∞</strong> (no upper limit). Add no bands to disable routing and use the single Merchant Name above.
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  Set a band to <strong>Rotate</strong> to spread its amounts across multiple gateways: each gateway handles <strong>Rotate&nbsp;every</strong> consecutive payouts of the <em>same amount</em> before handing off to the next in the pool (then it wraps around).
                </p>

                {settings.payoutGatewayBands.length === 0 && (
                  <p className="text-xs text-gray-400 italic mb-2">No bands — routing is off (single gateway).</p>
                )}

                <div className="space-y-3">
                  {settings.payoutGatewayBands.map((band, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-md p-3 space-y-3">
                      {/* Range + mode + remove */}
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-600">Min</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={band.min}
                            onChange={(e) => updateBand(idx, { min: e.target.value.replace(/[^\d.]/g, '') })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-600">Max</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={band.max}
                            onChange={(e) => updateBand(idx, { max: e.target.value.replace(/[^\d.]/g, '') })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="∞"
                          />
                        </div>
                        <div className="col-span-5">
                          <label className="block text-xs font-medium text-gray-600">Routing</label>
                          <div className="mt-1 inline-flex rounded-md border border-gray-300 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setBandMode(idx, 'single')}
                              className={`px-3 py-1.5 text-sm ${band.mode === 'single' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                              Single
                            </button>
                            <button
                              type="button"
                              onClick={() => setBandMode(idx, 'rotate')}
                              className={`px-3 py-1.5 text-sm border-l border-gray-300 ${band.mode === 'rotate' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                              Rotate
                            </button>
                          </div>
                        </div>
                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => removeBand(idx)}
                            className="w-full py-2 text-red-600 hover:text-red-800 text-sm font-medium"
                            title="Remove band"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Single-gateway mode */}
                      {band.mode === 'single' ? (
                        <div>
                          <label className="block text-xs font-medium text-gray-600">Gateway</label>
                          <select
                            value={band.gateway}
                            onChange={(e) => updateBand(idx, { gateway: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value="">Select Gateway</option>
                            {PAYOUT_GATEWAYS.map((g) => <option key={g} value={g}>{g === 'DummyGateway' ? 'Dummy (Test) Gateway' : g}</option>)}
                          </select>
                        </div>
                      ) : (
                        /* Rotation-pool mode */
                        <div className="space-y-2 bg-gray-50 rounded-md p-3">
                          <label className="block text-xs font-medium text-gray-600">Rotation pool (in order)</label>
                          {band.gateways.length === 0 && (
                            <p className="text-xs text-gray-400 italic">No gateways yet — add at least two.</p>
                          )}
                          {band.gateways.map((g, slot) => (
                            <div key={slot} className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-4 text-right">{slot + 1}.</span>
                              <select
                                value={g}
                                onChange={(e) => updatePoolSlot(idx, slot, e.target.value)}
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              >
                                <option value="">Select Gateway</option>
                                {PAYOUT_GATEWAYS.map((gw) => <option key={gw} value={gw}>{gw === 'DummyGateway' ? 'Dummy (Test) Gateway' : gw}</option>)}
                              </select>
                              <button
                                type="button"
                                onClick={() => removePoolSlot(idx, slot)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium px-1"
                                title="Remove gateway"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addPoolSlot(idx)}
                            className="inline-flex items-center py-1 px-2.5 border border-indigo-300 text-indigo-700 text-xs font-medium rounded-md hover:bg-indigo-50"
                          >
                            + Add gateway
                          </button>

                          <div className="flex items-center gap-2 pt-1">
                            <label className="text-xs font-medium text-gray-600">Rotate every</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={band.rotateEvery}
                              onChange={(e) => updateBand(idx, { rotateEvery: e.target.value.replace(/\D/g, '') })}
                              className="w-16 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-center"
                              placeholder="3"
                            />
                            <span className="text-xs text-gray-500">payout(s) of the same amount, then switch</span>
                          </div>

                          {band.gateways.filter(Boolean).length >= 2 && (
                            <p className="text-xs text-gray-600">
                              Sequence:&nbsp;
                              {band.gateways.filter(Boolean).map((gw, i) => (
                                <span key={i}>
                                  {i > 0 && ' → '}
                                  <span className="font-medium">{gw === 'DummyGateway' ? 'Dummy' : gw}</span> ×{band.rotateEvery || 1}
                                </span>
                              ))}
                              &nbsp;↻
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addBand}
                  className="mt-3 inline-flex items-center py-1.5 px-3 border border-indigo-300 text-indigo-700 text-sm font-medium rounded-md hover:bg-indigo-50"
                >
                  + Add band
                </button>

                {validateBandsClient(settings.payoutGatewayBands) && (
                  <p className="mt-2 text-xs text-red-600">{validateBandsClient(settings.payoutGatewayBands)}</p>
                )}
              </div>

              <button
                onClick={handlePayoutCallback}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Update Payout Callback
              </button>
            </div>
          </div>
        </div>

        {/* Per-gateway payout tally (amount routed through each gateway) */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-1">Payout Amount by Gateway</h2>
          <p className="text-sm text-gray-500 mb-4">Total value of this user's payouts processed through each gateway.</p>
          {gatewayStats.length === 0 ? (
            <p className="text-gray-500">No payouts recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="py-2 pr-4">Gateway</th>
                    <th className="py-2 px-4 text-right">Completed Amount</th>
                    <th className="py-2 px-4 text-right">Completed #</th>
                    <th className="py-2 px-4 text-right">Total Amount</th>
                    <th className="py-2 pl-4 text-right">Total #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {gatewayStats.map((g) => (
                    <tr key={g.gateway} className="text-sm text-gray-800">
                      <td className="py-2 pr-4 font-medium">{g.gateway === 'DummyGateway' ? 'Dummy (Test) Gateway' : g.gateway}</td>
                      <td className="py-2 px-4 text-right">{money(g.completed_amount)}</td>
                      <td className="py-2 px-4 text-right">{g.completed_count}</td>
                      <td className="py-2 px-4 text-right text-gray-500">{money(g.total_amount)}</td>
                      <td className="py-2 pl-4 text-right text-gray-500">{g.total_count}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="text-sm font-semibold border-t border-gray-200">
                    <td className="py-2 pr-4">Total</td>
                    <td className="py-2 px-4 text-right">{money(gatewayStats.reduce((s, g) => s + g.completed_amount, 0))}</td>
                    <td className="py-2 px-4 text-right">{gatewayStats.reduce((s, g) => s + g.completed_count, 0)}</td>
                    <td className="py-2 px-4 text-right text-gray-500">{money(gatewayStats.reduce((s, g) => s + g.total_amount, 0))}</td>
                    <td className="py-2 pl-4 text-right text-gray-500">{gatewayStats.reduce((s, g) => s + g.total_count, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}