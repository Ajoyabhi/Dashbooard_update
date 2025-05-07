import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { userMenuItems } from '../../data/mockData';

export default function DevelopmentDocs() {
  return (
    <DashboardLayout menuItems={userMenuItems} title="Development Documentation">
      <div className="space-y-6">
        {/* Documentation Sections */}
        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Getting Started</h2>
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-4">
              Welcome to our payment gateway API documentation. This guide will help you integrate our payment services into your application.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">API Authentication</h2>
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-4">
              All API requests require authentication using your API key. You can generate your API key from the Developer Settings page.
            </p>
            <div className="bg-gray-50 p-4 rounded-md">
              <code className="text-sm text-gray-800">
                Authorization: Bearer YOUR_API_KEY
              </code>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">API Endpoints</h2>
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Create Payment</h3>
              <p className="text-gray-600 mb-2">Create a new payment transaction</p>
              <div className="bg-gray-50 p-4 rounded-md">
                <code className="text-sm text-gray-800">
                  POST /api/v1/payments
                </code>
              </div>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Get Payment Status</h3>
              <p className="text-gray-600 mb-2">Check the status of a payment</p>
              <div className="bg-gray-50 p-4 rounded-md">
                <code className="text-sm text-gray-800">
                  GET /api/v1/payments/{'{payment_id}'}
                </code>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Webhook Integration</h3>
              <p className="text-gray-600 mb-2">Configure webhooks to receive payment notifications</p>
              <div className="bg-gray-50 p-4 rounded-md">
                <code className="text-sm text-gray-800">
                  POST /api/v1/webhooks
                </code>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Code Examples</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Node.js Example</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <pre className="text-sm text-gray-800">
                  {`const axios = require('axios');

const createPayment = async () => {
  try {
    const response = await axios.post('https://api.example.com/v1/payments', {
      amount: 1000,
      currency: 'INR',
      description: 'Test payment'
    }, {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY'
      }
    });
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
};`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}