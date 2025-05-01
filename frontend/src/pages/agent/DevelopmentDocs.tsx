import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { agentMenuItems } from '../../data/mockData';

const AgentDevelopmentDocs = () => {
  return (
    <DashboardLayout menuItems={agentMenuItems} title="Development Documentation">
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-6">Development Documentation</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="prose max-w-none">
            <h2>Getting Started</h2>
            <p>Welcome to the agent development documentation. Here you'll find everything you need to integrate with our platform.</p>
            
            <h2>API Reference</h2>
            <p>Detailed documentation for all available API endpoints will be listed here.</p>
            
            <h2>Webhooks</h2>
            <p>Learn how to receive real-time updates through our webhook system.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgentDevelopmentDocs;