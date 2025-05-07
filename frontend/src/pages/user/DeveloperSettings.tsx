import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { userMenuItems } from '../../data/mockData';

const DeveloperSettings = () => {
  const [token, setToken] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout menuItems={userMenuItems} title="Developer Settings">
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
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-600 mb-2">Configure your webhook endpoints here</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DeveloperSettings;