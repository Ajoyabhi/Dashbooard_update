import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { getMenuItems } from '../../utils/menuItems';
import { useAuth } from '../../context/AuthContext';

// Lightweight code block with copy button
const CodeBlock: React.FC<{ code: string; language?: string; title?: string }> = ({ code, language = 'bash', title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // noop
    }
  };

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">{title || language}</span>
        <button
          onClick={handleCopy}
          className="text-xs px-2 py-1 rounded bg-gray-800 text-white hover:bg-gray-700"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="m-0 p-4 overflow-x-auto text-sm leading-6">
        <code className="whitespace-pre text-gray-800">{code}</code>
      </pre>
    </div>
  );
};

export default function DevelopmentDocs() {
  const { user } = useAuth();

  return (
    <DashboardLayout menuItems={getMenuItems(user?.user_type || 'user')} title="Development Documentation">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold font-display text-neutral-900">
            AccuzPay API Documentation
          </h1>
          <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
            Use AccuzPay APIs to create payin and payout transactions and to track their status. This guide covers authentication,
            endpoints, request/response formats, and best practices for integrating with our payment gateway.
          </p>
        </div>

        {/* API Base URL */}
        <div className="card p-6">
          <h2 className="text-2xl font-bold font-display text-neutral-900 mb-4">
            Base URL
          </h2>
          <div className="bg-neutral-100 rounded-xl p-4">
            <span className="font-mono text-neutral-800">https://dashboard.accuzpay.in</span>
          </div>
        </div>

        {/* Authentication */}
        <div className="card p-6">
          <h2 className="text-2xl font-bold font-display text-neutral-900 mb-4">
            Authentication
          </h2>
          <p className="text-neutral-600 mb-4">
            All API requests require authentication using JWT tokens. Include the token in the Authorization header.
          </p>
          <div className="bg-neutral-100 rounded-xl p-4">
            <span className="font-mono text-neutral-800">Authorization: YOUR_JWT_TOKEN</span>
          </div>
        </div>

        {/* Payin API */}
        <div className="card p-6">
          <h2 className="text-2xl font-bold font-display text-neutral-900 mb-4">
            Create Payin Transaction
          </h2>
          <p className="text-neutral-600 mb-4">
            Create a new payin transaction to accept payments from customers.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Endpoint</h3>
              <div className="bg-neutral-100 rounded-xl p-4">
                <span className="font-mono text-neutral-800">POST https://dashboard.accuzpay.in/api/payments/payin</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Request Body</h3>
              <div className="bg-neutral-100 rounded-xl p-4">
                <pre className="text-sm text-neutral-800 overflow-x-auto">
                  {`{
  "order_amount": 1000,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "reference_id": "TXN123456"
}`}
                </pre>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">cURL Example</h3>
              <div className="bg-neutral-100 rounded-xl p-4">
                <pre className="text-sm text-neutral-800 overflow-x-auto">
                  {`curl --location 'https://dashboard.accuzpay.in/api/payments/payin' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: YOUR_JWT_TOKEN' \\
--data '{
  "order_amount": 1000,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "reference_id": "TXN123456"
}'`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Payout API */}
        <div className="card p-6">
          <h2 className="text-2xl font-bold font-display text-neutral-900 mb-4">
            Create Payout Transaction
          </h2>
          <p className="text-neutral-600 mb-4">
            Create a new payout transaction to transfer money to beneficiaries.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Endpoint</h3>
              <div className="bg-neutral-100 rounded-xl p-4">
                <span className="font-mono text-neutral-800">POST https://dashboard.accuzpay.in/api/payments/payout/</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Request Body</h3>
              <div className="bg-neutral-100 rounded-xl p-4">
                <pre className="text-sm text-neutral-800 overflow-x-auto">
                  {`{
  "amount": 500,
  "beneficiary_name": "Jane Smith",
  "account_number": "1234567890",
  "ifsc_code": "SBIN0001234",
  "reference_id": "PAYOUT123456"
}`}
                </pre>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">cURL Example</h3>
              <div className="bg-neutral-100 rounded-xl p-4">
                <pre className="text-sm text-neutral-800 overflow-x-auto">
                  {`curl --location 'https://dashboard.accuzpay.in/api/payments/payout/' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: YOUR_JWT_TOKEN' \\
--data '{
  "amount": 500,
  "beneficiary_name": "Jane Smith",
  "account_number": "1234567890",
  "ifsc_code": "SBIN0001234",
  "reference_id": "PAYOUT123456"
}'`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        <div className="card p-6">
          <h2 className="text-2xl font-bold font-display text-neutral-900 mb-4">
            Check Transaction Status
          </h2>
          <p className="text-neutral-600 mb-4">
            Check the status of payin and payout transactions using their transaction IDs.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Payin Status</h3>
              <div className="bg-neutral-100 rounded-xl p-4">
                <pre className="text-sm text-neutral-800 overflow-x-auto">
                  {`curl --location 'https://dashboard.accuzpay.in/api/payments/payin/transaction/{transaction_id}' \\
--header 'Authorization: YOUR_JWT_TOKEN'`}
                </pre>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Payout Status</h3>
              <div className="bg-neutral-100 rounded-xl p-4">
                <pre className="text-sm text-neutral-800 overflow-x-auto">
                  {`curl --location 'https://dashboard.accuzpay.in/api/payments/payout/transaction/{transaction_id}' \\
--header 'Authorization: YOUR_JWT_TOKEN'`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Check */}
        <div className="card p-6">
          <h2 className="text-2xl font-bold font-display text-neutral-900 mb-4">
            Check Account Balance
          </h2>
          <p className="text-neutral-600 mb-4">
            Check your current account balance and transaction limits.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Endpoint</h3>
              <div className="bg-neutral-100 rounded-xl p-4">
                <span className="font-mono text-neutral-800">GET https://dashboard.accuzpay.in/api/payments/balanceCheck</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">cURL Example</h3>
              <div className="bg-neutral-100 rounded-xl p-4">
                <pre className="text-sm text-neutral-800 overflow-x-auto">
                  {`curl --location 'https://dashboard.accuzpay.in/api/payments/balanceCheck' \\
--header 'Authorization: YOUR_JWT_TOKEN'`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Notes & Requirements</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li><span className="font-mono">reference_id</span> can be any character between 12 to 25 alphanumeric string.</li>
            <li>Amounts should be strings.</li>
            <li>Phone numbers must be exactly 10 digits.</li>
            <li>Always include <span className="font-mono">Content-Type: application/json</span> in requests with bodies.</li>
            <li>Get your JWT token from <Link className="text-indigo-600 hover:underline" to="/user/developer-settings">Developer Settings</Link>.</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}