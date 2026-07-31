import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { getMenuItems } from '../../utils/menuItems';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';

const DeveloperSettings = () => {
  const { user } = useAuth();
  const [token, setToken] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Webhook configuration state
  const [payinCallback, setPayinCallback] = useState('');
  const [payoutCallback, setPayoutCallback] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    const fetchWebhooks = async () => {
      try {
        const response = await api.get('/user/webhooks');
        if (response.data?.success) {
          const d = response.data.data;
          setPayinCallback(d.payin_callback || '');
          setPayoutCallback(d.payout_callback || '');
        }
      } catch (error) {
        toast.error('Failed to load webhook configuration');
      } finally {
        setLoading(false);
      }
    };
    fetchWebhooks();
  }, []);

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isValidUrl = (url: string) => {
    if (!url) return true; // empty clears the webhook
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSaveWebhooks = async () => {
    if (!isValidUrl(payinCallback)) {
      toast.error('Payin webhook must be a valid http(s) URL');
      return;
    }
    if (!isValidUrl(payoutCallback)) {
      toast.error('Payout webhook must be a valid http(s) URL');
      return;
    }
    setSaving(true);
    try {
      const response = await api.put('/user/webhooks', {
        payin_callback: payinCallback.trim(),
        payout_callback: payoutCallback.trim(),
      });
      if (response.data?.success) {
        toast.success('Webhook configuration saved');
      } else {
        toast.error(response.data?.message || 'Failed to save webhooks');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error saving webhook configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout menuItems={getMenuItems(user?.user_type || 'user')} title="Developer Settings">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Authentication Token</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">Your JWT Authentication Token</p>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <code className="text-sm font-mono text-green-600 break-all bg-green-50 px-2 py-1 rounded">
                      {token || 'No token found'}
                    </code>
                  </div>
                </div>
                {token && (
                  <button
                    onClick={handleCopyToken}
                    className="ml-4 p-2 text-gray-500 hover:text-green-600 focus:outline-none transition-colors duration-200"
                    title="Copy token"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500">
              This token is used to authenticate your API requests. Keep it secure and never share it publicly.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Webhook Configuration</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure the endpoints where AccuzPay will POST payment status updates. Use a publicly reachable
            HTTPS URL that returns HTTP 200.
          </p>

          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payin Webhook URL
                </label>
                <input
                  type="url"
                  value={payinCallback}
                  onChange={(e) => setPayinCallback(e.target.value)}
                  placeholder="https://your-domain.com/webhooks/payin"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payout Webhook URL
                </label>
                <input
                  type="url"
                  value={payoutCallback}
                  onChange={(e) => setPayoutCallback(e.target.value)}
                  placeholder="https://your-domain.com/webhooks/payout"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <button
                onClick={handleSaveWebhooks}
                disabled={saving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Webhooks'}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DeveloperSettings;
