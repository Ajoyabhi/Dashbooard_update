import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { userMenuItems } from '../../data/mockData';

// Lightweight code block with copy button
const CodeBlock: React.FC<{ code: string; language?: string; title?: string } > = ({ code, language = 'bash', title }) => {
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
  return (
    <DashboardLayout menuItems={userMenuItems} title="Development Documentation">
      <div className="space-y-6">
        {/* Overview */}
        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Overview</h2>
          <p className="text-gray-600">
            Use ZentexPay APIs to create payin and payout transactions and to track their status. This guide covers authentication,
            required headers, endpoint URLs, and request examples.
          </p>
        </div>

        {/* Authentication */}
        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Authentication</h2>
          <div className="space-y-4">
            <p className="text-gray-600">
              All API requests require a JWT in the <span className="font-mono">Authorization</span> header. Tokens are valid for 24 hours.
              Retrieve your token from <Link className="text-indigo-600 hover:underline" to="/user/developer-settings">Developer Settings</Link>.
            </p>
            <CodeBlock
              title="HTTP Header"
              language="http"
              code={`Authorization: YOUR_JWT_TOKEN\nContent-Type: application/json`}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-md bg-indigo-50 border border-indigo-200">
                <p className="text-sm text-indigo-800">
                  Base URL: <span className="font-mono">https://api.zentexpay.in</span>
                </p>
              </div>
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-800">
                  Keep your token secret. Do not embed it in client-side code shipped to browsers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payin */}
        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Payin</h2>
          <p className="text-gray-600 mb-3">Create a new payment transaction.</p>
          <div className="space-y-4">
            <CodeBlock
              title="Endpoint"
              code={`POST https://api.zentexpay.in/api/payments/payin`}
            />
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-2">Request Body</h4>
              <CodeBlock
                title="JSON"
                language="json"
                code={`{\n  "order_amount": "500",\n  "email": "user@example.com",\n  "phone": "9876543210",\n  "name": "John Smith",\n  "reference_id": "PAY123456789"\n}`}
              />
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-2">cURL Example</h4>
              <CodeBlock
                title="cURL"
                language="bash"
                code={`curl --location 'https://api.zentexpay.in/api/payments/payin' \
--header 'Authorization: YOUR_JWT_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
  "order_amount": "500",
  "email": "user@example.com",
  "phone": "9876543210",
  "name": "John Smith",
  "reference_id": "PAY123456789"
}'`}
              />
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-2">Sample Response</h4>
              <CodeBlock
                title="JSON"
                language="json"
                code={`{\n  "transaction_id": "123e4567-e89b-12d3-a456-426614174000",\n  "result": {\n    "success": true,\n    "reference_id": "PAYIN123456789",\n    "payment_url": "upi://pay?pa=merchant@bank&pn=Merchant%20Name&am=100&tr=PAYIN123456789&cu=INR"\n  }\n}`}
              />
              <p className="text-xs text-gray-500 mt-2">Values above are examples. Your <span className="font-mono">transaction_id</span>, <span className="font-mono">reference_id</span> and <span className="font-mono">payment_url</span> will differ.</p>
            </div>
          </div>
        </div>

        {/* Payout */}
        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Payout</h2>
          <p className="text-gray-600 mb-3">Initiate a payout transaction.</p>
          <div className="space-y-4">
            <CodeBlock
              title="Endpoint"
              code={`POST https://api.zentexpay.in/api/payments/payout/`}
            />
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-2">Request Body</h4>
              <CodeBlock
                title="JSON"
                language="json"
                code={`{\n  "amount": "2000",\n  "account_number": "9876543210",\n  "account_ifsc": "SBIN0001234",\n  "bank_name": "State Bank of India",\n  "beneficiary_name": "Jane Doe",\n  "request_type": "IMPS",\n  "reference_id": "POUT987654321"\n}`}
              />
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-2">cURL Example</h4>
              <CodeBlock
                title="cURL"
                language="bash"
                code={`curl --location 'https://api.zentexpay.in/api/payments/payout/' \
--header 'Authorization: YOUR_JWT_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
  "amount": "2000",
  "account_number": "9876543210",
  "account_ifsc": "SBIN0001234",
  "bank_name": "State Bank of India",
  "beneficiary_name": "Jane Doe",
  "request_type": "IMPS",
  "reference_id": "POUT987654321"
}'`}
              />
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Transaction Status</h2>
          <p className="text-gray-600 mb-4">Use these endpoints to retrieve the latest status for a specific transaction.</p>
          <div className="space-y-4">
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-2">Payin Status</h4>
              <div className="p-3 rounded-md bg-gray-50 border border-gray-200 mb-3">
                <p className="text-sm text-gray-700">
                  Path parameter <span className="font-mono">{`{transaction_id}`}</span>: The transaction identifier returned when you created the payin.
                </p>
              </div>
              <CodeBlock
                title="cURL"
                code={`curl --location 'https://api.zentexpay.in/api/payments/payin/transaction/{transaction_id}' \n--header 'Authorization: YOUR_JWT_TOKEN'`}
              />
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-2">Payout Status</h4>
              <div className="p-3 rounded-md bg-gray-50 border border-gray-200 mb-3">
                <p className="text-sm text-gray-700">
                  Path parameter <span className="font-mono">{`{transaction_id}`}</span>: The transaction identifier returned when you created the payout.
                </p>
              </div>
              <CodeBlock
                title="cURL"
                code={`curl --location 'https://api.zentexpay.in/api/payments/payout/transaction/{transaction_id}' \n--header 'Authorization: YOUR_JWT_TOKEN'`}
              />
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