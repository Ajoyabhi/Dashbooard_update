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
  "reference_id": "TXN123456",
  "address": {
    "line1": "123 Main Street",
    "line2": "Apt 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }
}`}
                </pre>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Parameters</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">Parameter</th>
                      <th className="text-left px-4 py-2 font-semibold">Type</th>
                      <th className="text-left px-4 py-2 font-semibold">Required</th>
                      <th className="text-left px-4 py-2 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[
                      { param: 'order_amount', type: 'number', required: 'Yes', desc: 'Amount to be charged (in paise)' },
                      { param: 'name',         type: 'string', required: 'Yes', desc: "Customer's full name" },
                      { param: 'email',        type: 'string', required: 'Yes', desc: "Customer's email address" },
                      { param: 'phone',        type: 'string', required: 'Yes', desc: "Customer's phone number (10 digits)" },
                      { param: 'reference_id', type: 'string', required: 'Yes', desc: 'Unique reference ID (12-25 alphanumeric characters)' },
                      { param: 'address',          type: 'object', required: 'Yes', desc: "Customer's billing address" },
                      { param: 'address.pincode',  type: 'string', required: 'Yes', desc: '6-digit postal/PIN code' },
                      { param: 'address.line1',    type: 'string', required: 'No',  desc: 'Street address line 1' },
                      { param: 'address.line2',    type: 'string', required: 'No',  desc: 'Street address line 2 (apartment, suite, etc.)' },
                      { param: 'address.city',     type: 'string', required: 'No',  desc: 'City name' },
                      { param: 'address.state',    type: 'string', required: 'No',  desc: 'State name' },
                      { param: 'address.country',  type: 'string', required: 'No',  desc: 'Country name (default: India)' },
                    ].map(({ param, type, required, desc }) => (
                      <tr key={param} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-indigo-700">{param}</td>
                        <td className="px-4 py-2 text-gray-600">{type}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${required === 'Yes' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            {required}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
  "reference_id": "TXN123456",
  "address": {
    "line1": "123 Main Street",
    "line2": "Apt 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }
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
                <span className="font-mono text-neutral-800">POST https://dashboard.accuzpay.in/api/payments/payout</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Request Body</h3>
              <div className="bg-neutral-100 rounded-xl p-4">
                <pre className="text-sm text-neutral-800 overflow-x-auto">
                  {`{
  "amount": "1000",
  "account_number": "1234567890",
  "account_ifsc": "SBIN0001234",
  "bank_name": "State Bank of India",
  "beneficiary_name": "John Doe",
  "request_type": "IMPS",
  "reference_id": "PAYOUT123456"
}`}
                </pre>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">cURL Example</h3>
              <div className="bg-neutral-100 rounded-xl p-4">
                <pre className="text-sm text-neutral-800 overflow-x-auto">
                  {`curl --location 'https://dashboard.accuzpay.in/api/payments/payout' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: YOUR_JWT_TOKEN' \\
--data '{
  "amount": "1000",
  "account_number": "1234567890",
  "account_ifsc": "SBIN0001234",
  "bank_name": "State Bank of India",
  "beneficiary_name": "John Doe",
  "request_type": "IMPS",
  "reference_id": "PAYOUT123456"
}'`}
                </pre>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Error Responses</h3>
              <p className="text-neutral-600 mb-3">
                If the payout cannot be processed, the API responds with HTTP <span className="font-mono">400</span> and
                <span className="font-mono"> success: false</span> along with a descriptive
                <span className="font-mono"> message</span>.
              </p>

              <p className="text-sm font-semibold text-neutral-700 mb-1">Validation Error</p>
              <p className="text-sm text-neutral-600 mb-2">
                Returned when the payout or beneficiary details fail the payment gateway's validation checks — for
                example a malformed account number or IFSC, an unsupported amount, or a missing beneficiary field. The
                <span className="font-mono"> message</span> names the specific field and reason that failed.
              </p>
              <div className="bg-neutral-100 rounded-xl p-4">
                <pre className="text-sm text-neutral-800 overflow-x-auto">
{`{
  "success": false,
  "message": "bank_account_number: Invalid Bank Account Number",
  "reference_id": "PAYOUT123456ABCD"
}`}
                </pre>
              </div>
              <p className="text-sm text-neutral-500 mt-2 mb-4">
                <span className="font-semibold">Recommended Action:</span> Recheck the payout request fields
                (<span className="font-mono">account_number</span>, <span className="font-mono">account_ifsc</span>,
                <span className="font-mono"> beneficiary_name</span>, <span className="font-mono">amount</span>,
                <span className="font-mono"> request_type</span>) and re-submit with corrected details.
              </p>

              <p className="text-sm text-neutral-500">
                <span className="font-semibold">Note:</span> Every payout rejection is returned as HTTP{' '}
                <span className="font-mono">400</span> with the shape{' '}
                <span className="font-mono">{`{ "success": false, "message": "...", "reference_id": "..." }`}</span>.
                The <span className="font-mono">message</span> is passed through from the payment gateway, so treat it as
                a human-readable reason rather than a fixed set of values — always read{' '}
                <span className="font-mono">message</span> for the exact cause, and reconcile the final outcome via the
                Check Transaction Status API.
              </p>
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        <div className="card p-6">
          <h2 className="text-2xl font-bold font-display text-neutral-900 mb-4">
            Check Transaction Status
          </h2>
          <p className="text-neutral-600 mb-4">
            Check the status of payin and payout transactions using their transaction IDs. Both endpoints
            return the same uniform <span className="font-mono">transaction</span> object.
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
              <p className="text-sm text-neutral-500 mt-2 mb-1">Response</p>
              <div className="bg-neutral-100 rounded-xl p-4">
                <pre className="text-sm text-neutral-800 overflow-x-auto">
{`{
  "success": true,
  "transaction": {
    "reference_id": "TXN123456ABCD",
    "type": "payin",
    "status": "success",
    "amount": 100,
    "utr": "UTR123456789",
    "message": "Transaction processed",
    "timestamp": "2026-06-15T10:30:00.000Z"
  }
}`}
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
              <p className="text-sm text-neutral-500 mt-2 mb-1">Response</p>
              <div className="bg-neutral-100 rounded-xl p-4">
                <pre className="text-sm text-neutral-800 overflow-x-auto">
{`{
  "success": true,
  "transaction": {
    "reference_id": "PAYOUT123456ABCD",
    "type": "payout",
    "status": "success",
    "amount": 300,
    "utr": "UTR123456789",
    "message": "Transaction processed",
    "timestamp": "2026-06-15T10:30:00.000Z"
  }
}`}
                </pre>
              </div>
            </div>
            <p className="text-sm text-neutral-500">
              <span className="font-mono">status</span> is always one of <span className="font-mono">"success"</span>,
              <span className="font-mono"> "failed"</span> or <span className="font-mono">"pending"</span>. On a
              failed or pending transaction <span className="font-mono">utr</span> is <span className="font-mono">null</span>.
            </p>
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

        {/* Webhook / Callback */}
        <div className="card p-6">
          <h2 className="text-2xl font-bold font-display text-neutral-900 mb-2">
            Webhook / Callback Notifications
          </h2>
          <p className="text-neutral-600 mb-6">
            AccuzPay sends an HTTP <span className="font-mono font-semibold">POST</span> request to your registered callback URL whenever a transaction status changes. Configure your callback URLs in <Link className="text-indigo-600 hover:underline" to="/user/developer-settings">Developer Settings</Link>.
          </p>

          <div className="space-y-6">

            {/* Payin Callback */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-1">Payin Callback Payload</h3>
              <p className="text-sm text-neutral-500 mb-3">Sent when a payin transaction succeeds or fails.</p>
              <div className="bg-neutral-100 rounded-xl p-4">
                <pre className="text-sm text-neutral-800 overflow-x-auto">
{`{
  "reference_id": "PAYO454789251396",
  "type": "payin",
  "status": "success",
  "amount": 100,
  "utr": "UTR123456789",
  "message": "Transaction processed",
  "timestamp": "2026-06-15T10:30:00.000Z"
}`}
                </pre>
              </div>
            </div>

            {/* Payout Callback */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-1">Payout Callback Payload</h3>
              <p className="text-sm text-neutral-500 mb-3">Sent when a payout transaction succeeds or fails.</p>
              <div className="bg-neutral-100 rounded-xl p-4">
                <pre className="text-sm text-neutral-800 overflow-x-auto">
{`{
  "reference_id": "PAYOUT123456",
  "type": "payout",
  "status": "success",
  "amount": 500,
  "utr": "UTR123456789",
  "message": "Transaction processed",
  "timestamp": "2026-06-15T10:30:00.000Z"
}`}
                </pre>
              </div>
            </div>

            {/* Status values */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Callback Fields</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">Field</th>
                      <th className="text-left px-4 py-2 font-semibold">Type</th>
                      <th className="text-left px-4 py-2 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[
                      { field: 'reference_id', type: 'string', desc: 'Your unique reference ID sent during transaction initiation' },
                      { field: 'type',         type: 'string', desc: 'Transaction type: "payin" or "payout"' },
                      { field: 'status',       type: 'string', desc: 'Transaction status: "success", "failed" or "pending" (same values for payin and payout)' },
                      { field: 'amount',       type: 'number', desc: 'Transaction amount' },
                      { field: 'utr',          type: 'string', desc: 'Unique Transaction Reference from the bank. null if failed' },
                      { field: 'message',      type: 'string', desc: 'Human-readable status message' },
                      { field: 'timestamp',    type: 'string', desc: 'ISO 8601 timestamp of when the callback was sent' },
                    ].map(({ field, type, desc }) => (
                      <tr key={field} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-indigo-700">{field}</td>
                        <td className="px-4 py-2 text-gray-600">{type}</td>
                        <td className="px-4 py-2 text-gray-600">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Best practices */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-indigo-800 mb-2">Best Practices</h3>
              <ul className="list-disc pl-5 text-sm text-indigo-700 space-y-1">
                <li>Always return a <span className="font-mono">200 OK</span> response from your callback endpoint, otherwise AccuzPay will retry.</li>
                <li>Verify the <span className="font-mono">reference_id</span> against your own records before updating transaction status.</li>
                <li>Do not rely solely on the callback — use the <strong>Check Transaction Status</strong> API as a fallback.</li>
                <li>Your callback endpoint must respond within <strong>5 seconds</strong> to avoid a timeout.</li>
              </ul>
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
            <li>The <span className="font-mono">address</span> object is required for payin. At minimum, <span className="font-mono">address.pincode</span> must be provided.</li>
            <li>Always include <span className="font-mono">Content-Type: application/json</span> in requests with bodies.</li>
            <li>Get your JWT token from <Link className="text-indigo-600 hover:underline" to="/user/developer-settings">Developer Settings</Link>.</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}