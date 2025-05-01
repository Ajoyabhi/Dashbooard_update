import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { agentMenuItems } from '../../data/mockData';

const AgentDeveloperSettings = () => {
  return (
    <DashboardLayout menuItems={agentMenuItems} title="Developer Settings">
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-6">Developer Settings</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium mb-4">API Credentials</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600 mb-2">Your API keys and credentials will appear here</p>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-medium mb-4">Webhook Configuration</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600 mb-2">Configure your webhook endpoints here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgentDeveloperSettings;