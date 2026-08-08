import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Play } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../data/mockData';
import api from '../../utils/axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  payoutGatewayThreshold: string;
  payoutGatewayAbove: string;
  payoutGatewayBelow: string;
  currentPayinUrl: string;
  currentPayoutUrl: string;
  currentPayinMerchantName: string;
  currentPayoutMerchantName: string;
  currentDummyUtrPrefix: string;
  currentPayoutGatewayThreshold: string;
  currentPayoutGatewayAbove: string;
  currentPayoutGatewayBelow: string;
}

const PAYOUT_GATEWAYS = ['BluSwap', 'MizorPay', 'DummyGateway'];

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
    payoutGatewayThreshold: '',
    payoutGatewayAbove: '',
    payoutGatewayBelow: '',
    currentPayinUrl: '',
    currentPayoutUrl: '',
    currentPayinMerchantName: '',
    currentPayoutMerchantName: '',
    currentDummyUtrPrefix: '',
    currentPayoutGatewayThreshold: '',
    currentPayoutGatewayAbove: '',
    currentPayoutGatewayBelow: ''
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
          const { payin_callback, payout_callback, payin_merchant_name, payout_merchant_name, dummy_utr_prefix,
            payout_gateway_threshold, payout_gateway_above, payout_gateway_below } = response.data.data;
          const thresholdStr = (payout_gateway_threshold ?? '') === '' ? '' : String(payout_gateway_threshold);
          setSettings(prev => ({
            ...prev,
            payinUrl: '',
            payoutUrl: '',
            payinMerchantName: '',
            payoutMerchantName: '',
            dummyUtrPrefix: dummy_utr_prefix || '',
            payoutGatewayThreshold: thresholdStr,
            payoutGatewayAbove: payout_gateway_above || '',
            payoutGatewayBelow: payout_gateway_below || '',
            currentPayinUrl: payin_callback || '',
            currentPayoutUrl: payout_callback || '',
            currentPayinMerchantName: payin_merchant_name || '',
            currentPayoutMerchantName: payout_merchant_name || '',
            currentDummyUtrPrefix: dummy_utr_prefix || '',
            currentPayoutGatewayThreshold: thresholdStr,
            currentPayoutGatewayAbove: payout_gateway_above || '',
            currentPayoutGatewayBelow: payout_gateway_below || ''
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

  const handlePayoutCallback = async () => {
    try {
      const response = await api.post(`/admin/users/${userId}/callback/payout`, settings);
      if (response.data.success) {
        // Reflect the authoritative record — fields the admin left blank were
        // preserved server-side, so read the current values back from the response
        // instead of the (possibly empty) form inputs.
        const d = response.data.data || {};
        const thStr = (d.payout_gateway_threshold ?? '') === '' ? '' : String(d.payout_gateway_threshold);
        setSettings(prev => ({
          ...prev,
          currentPayoutUrl: d.payout_callback ?? prev.currentPayoutUrl,
          currentPayoutMerchantName: d.payout_merchant_name ?? prev.currentPayoutMerchantName,
          currentDummyUtrPrefix: d.dummy_utr_prefix ?? prev.currentDummyUtrPrefix,
          currentPayoutGatewayThreshold: thStr,
          currentPayoutGatewayAbove: d.payout_gateway_above ?? prev.currentPayoutGatewayAbove,
          currentPayoutGatewayBelow: d.payout_gateway_below ?? prev.currentPayoutGatewayBelow,
          payoutGatewayThreshold: thStr,
          payoutGatewayAbove: d.payout_gateway_above ?? prev.payoutGatewayAbove,
          payoutGatewayBelow: d.payout_gateway_below ?? prev.payoutGatewayBelow,
          payoutUrl: '',
          payoutMerchantName: ''
        }));
        toast.success('Payout Callback updated successfully');
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error updating payout callback:', error);
    }
  };

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
              {settings.currentPayoutMerchantName === 'DummyGateway' && (
                <p className="text-sm text-gray-500">Dummy UTR Prefix: {settings.currentDummyUtrPrefix || 'Not set (random)'}</p>
              )}
              {settings.currentPayoutGatewayThreshold ? (
                <p className="text-sm text-gray-500">
                  Routing: ≥ {settings.currentPayoutGatewayThreshold} → {settings.currentPayoutGatewayAbove || '—'}, &lt; {settings.currentPayoutGatewayThreshold} → {settings.currentPayoutGatewayBelow || '—'}
                </p>
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
              {settings.payoutMerchantName === 'DummyGateway' && (
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

              {/* Amount-based gateway routing */}
              <div className="border-t border-gray-200 pt-4 mt-2">
                <h4 className="font-medium text-gray-700">Amount-based Routing (optional)</h4>
                <p className="text-xs text-gray-500 mb-2">
                  Route by amount instead of the single gateway above. If the amount is <strong>≥ threshold</strong> it uses gateway A; otherwise gateway B. Leave the threshold blank to disable routing and use the single Merchant Name above.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Threshold Amount (X)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={settings.payoutGatewayThreshold}
                    onChange={(e) => setSettings({ ...settings, payoutGatewayThreshold: e.target.value.replace(/[^\d.]/g, '') })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="e.g. 50000 (blank = routing off)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gateway A (amount ≥ X)</label>
                    <select
                      value={settings.payoutGatewayAbove}
                      onChange={(e) => setSettings({ ...settings, payoutGatewayAbove: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Select Gateway</option>
                      {PAYOUT_GATEWAYS.map((g) => <option key={g} value={g}>{g === 'DummyGateway' ? 'Dummy (Test) Gateway' : g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gateway B (amount &lt; X)</label>
                    <select
                      value={settings.payoutGatewayBelow}
                      onChange={(e) => setSettings({ ...settings, payoutGatewayBelow: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Select Gateway</option>
                      {PAYOUT_GATEWAYS.map((g) => <option key={g} value={g}>{g === 'DummyGateway' ? 'Dummy (Test) Gateway' : g}</option>)}
                    </select>
                  </div>
                </div>
                {settings.payoutGatewayThreshold && (!settings.payoutGatewayAbove || !settings.payoutGatewayBelow) && (
                  <p className="mt-2 text-xs text-red-600">Set both Gateway A and Gateway B, or clear the threshold to disable routing.</p>
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