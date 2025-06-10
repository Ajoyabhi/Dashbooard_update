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
  currentPayinUrl: string;
  currentPayoutUrl: string;
  currentPayinMerchantName: string;
  currentPayoutMerchantName: string;
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
    currentPayinUrl: '',
    currentPayoutUrl: '',
    currentPayinMerchantName: '',
    currentPayoutMerchantName: ''
  });

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
          const { payin_callback, payout_callback, payin_merchant_name, payout_merchant_name } = response.data.data;
          setSettings(prev => ({
            ...prev,
            payinUrl: '',
            payoutUrl: '',
            payinMerchantName: '',
            payoutMerchantName: '',
            currentPayinUrl: payin_callback || '',
            currentPayoutUrl: payout_callback || '',
            currentPayinMerchantName: payin_merchant_name || '',
            currentPayoutMerchantName: payout_merchant_name || ''
          }));
        } else {
          toast.error('Failed to fetch callback details');
        }
      } catch (error) {
        console.error('Error fetching callback details:', error);
        toast.error('Error fetching callback details');
      }
    };

    fetchCallbackDetails();
  }, [userId]);

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
        setSettings(prev => ({
          ...prev,
          currentPayinUrl: settings.payinUrl,
          currentPayinMerchantName: settings.payinMerchantName,
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
        setSettings(prev => ({
          ...prev,
          currentPayoutUrl: settings.payoutUrl,
          currentPayoutMerchantName: settings.payoutMerchantName,
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
        <div className="bg-white rounded-lg shadow-md p-10 mb-10">
          <h2 className="text-2xl font-semibold mb-8">Current Callback Settings</h2>
          <div className="grid grid-cols-2 gap-16">
            <div className="overflow-hidden p-6 border border-gray-200 rounded-lg shadow-sm">
              <h3 className="font-medium text-gray-700 text-lg mb-4">Payin Callback</h3>
              <p className="text-gray-600 break-all mb-3 text-base" title={settings.currentPayinUrl || 'Not set'}>
                {settings.currentPayinUrl || 'Not set'}
              </p>
              <p className="text-sm text-gray-500 break-all" title={settings.currentPayinMerchantName || 'Not set'}>
                Merchant: {settings.currentPayinMerchantName || 'Not set'}
              </p>
            </div>
            <div className="overflow-hidden p-6 border border-gray-200 rounded-lg shadow-sm">
              <h3 className="font-medium text-gray-700 text-lg mb-4">Payout Callback</h3>
              <p className="text-gray-600 break-all mb-3 text-base" title={settings.currentPayoutUrl || 'Not set'}>
                {settings.currentPayoutUrl || 'Not set'}
              </p>
              <p className="text-sm text-gray-500 break-all" title={settings.currentPayoutMerchantName || 'Not set'}>
                Merchant: {settings.currentPayoutMerchantName || 'Not set'}
              </p>
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
                <input
                  type="text"
                  value={settings.payinMerchantName}
                  onChange={(e) => setSettings({ ...settings, payinMerchantName: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Enter new merchant name"
                />
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
                <input
                  type="text"
                  value={settings.payoutMerchantName}
                  onChange={(e) => setSettings({ ...settings, payoutMerchantName: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Enter new merchant name"
                />
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
      </div>
    </DashboardLayout>
  );
}