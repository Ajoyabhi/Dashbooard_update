import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Play } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../data/mockData';

interface CallbackSettings {
  payinUrl: string;
  payinMethod: string;
  payinHeaders: string;
  payoutUrl: string;
  payoutMethod: string;
  payoutHeaders: string;
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
    payoutHeaders: ''
  });
  
  const [testStatus, setTestStatus] = useState<{
    payin: 'idle' | 'loading' | 'success' | 'error';
    payout: 'idle' | 'loading' | 'success' | 'error';
  }>({
    payin: 'idle',
    payout: 'idle'
  });

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

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Callback Settings">
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg">
          <div className="p-6 space-y-6">
            {/* Payin Callback */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Payin Callback</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Callback URL
                  </label>
                  <input
                    type="url"
                    value={settings.payinUrl}
                    onChange={(e) => setSettings({ ...settings, payinUrl: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="https://"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      HTTP Method
                    </label>
                    <select
                      value={settings.payinMethod}
                      onChange={(e) => setSettings({ ...settings, payinMethod: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Headers
                    </label>
                    <input
                      type="text"
                      value={settings.payinHeaders}
                      onChange={(e) => setSettings({ ...settings, payinHeaders: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      placeholder="Authorization: Bearer token"
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => testCallback('payin')}
                    disabled={testStatus.payin === 'loading'}
                    className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      testStatus.payin === 'loading'
                        ? 'bg-gray-400 cursor-not-allowed'
                        : testStatus.payin === 'success'
                        ? 'bg-success-600 hover:bg-success-700'
                        : testStatus.payin === 'error'
                        ? 'bg-error-600 hover:bg-error-700'
                        : 'bg-primary-600 hover:bg-primary-700'
                    }`}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {testStatus.payin === 'loading'
                      ? 'Testing...'
                      : testStatus.payin === 'success'
                      ? 'Test Successful'
                      : testStatus.payin === 'error'
                      ? 'Test Failed'
                      : 'Test Callback'}
                  </button>
                </div>
              </div>
            </div>

            {/* Payout Callback */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Payout Callback</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Callback URL
                  </label>
                  <input
                    type="url"
                    value={settings.payoutUrl}
                    onChange={(e) => setSettings({ ...settings, payoutUrl: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="https://"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      HTTP Method
                    </label>
                    <select
                      value={settings.payoutMethod}
                      onChange={(e) => setSettings({ ...settings, payoutMethod: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Headers
                    </label>
                    <input
                      type="text"
                      value={settings.payoutHeaders}
                      onChange={(e) => setSettings({ ...settings, payoutHeaders: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      placeholder="Authorization: Bearer token"
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => testCallback('payout')}
                    disabled={testStatus.payout === 'loading'}
                    className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      testStatus.payout === 'loading'
                        ? 'bg-gray-400 cursor-not-allowed'
                        : testStatus.payout === 'success'
                        ? 'bg-success-600 hover:bg-success-700'
                        : testStatus.payout === 'error'
                        ? 'bg-error-600 hover:bg-error-700'
                        : 'bg-primary-600 hover:bg-primary-700'
                    }`}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {testStatus.payout === 'loading'
                      ? 'Testing...'
                      : testStatus.payout === 'success'
                      ? 'Test Successful'
                      : testStatus.payout === 'error'
                      ? 'Test Failed'
                      : 'Test Callback'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <Save className="h-4 w-4 mr-2 inline-block" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}