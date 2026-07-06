import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Check } from 'lucide-react'

const BASE_URL = 'https://api.shrivatsam.in'

function CodeBlock({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1A2744]">
        <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">{title || 'code'}</span>
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors">
          {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
      <pre className="m-0 p-4 overflow-x-auto text-sm leading-6 bg-slate-950 text-slate-100 font-mono whitespace-pre">{code}</pre>
    </div>
  )
}

function ParamTable({ rows }: { rows: { param: string; type: string; required: string; desc: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Parameter</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Type</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Required</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(({ param, type, required, desc }) => (
            <tr key={param} className="bg-white hover:bg-slate-50">
              <td className="px-4 py-2.5 font-mono text-[#1A2744] text-xs font-semibold">{param}</td>
              <td className="px-4 py-2.5 text-slate-500 text-xs">{type}</td>
              <td className="px-4 py-2.5">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${required === 'Yes' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{required}</span>
              </td>
              <td className="px-4 py-2.5 text-slate-600 text-xs">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FieldTable({ rows }: { rows: { field: string; type: string; desc: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Field</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Type</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(({ field, type, desc }) => (
            <tr key={field} className="bg-white hover:bg-slate-50">
              <td className="px-4 py-2.5 font-mono text-[#1A2744] text-xs font-semibold">{field}</td>
              <td className="px-4 py-2.5 text-slate-500 text-xs">{type}</td>
              <td className="px-4 py-2.5 text-slate-600 text-xs">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <span className="w-1 h-5 bg-[#1A2744] rounded-full" />
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function DevelopmentDocs() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">

      {/* Hero */}
      <div className="bg-gradient-to-r from-[#1A2744] to-[#2D4A8A] rounded-2xl p-8 text-white">
        <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-widest mb-2">Shrivatsam Payments</p>
        <h1 className="text-3xl font-bold mb-3">API Documentation</h1>
        <p className="text-blue-200 text-sm max-w-2xl">
          Integrate Shrivatsam's payment gateway to accept and send payments. This guide covers authentication, endpoints, request/response formats, and webhook handling.
        </p>
      </div>

      {/* Base URL */}
      <Section title="Base URL">
        <p className="text-sm text-slate-500">All API requests must be made to the following base URL:</p>
        <CodeBlock title="base url" code={BASE_URL} />
      </Section>

      {/* Authentication */}
      <Section title="Authentication">
        <p className="text-sm text-slate-600">
          All API requests require a JWT token in the <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs text-[#1A2744]">Authorization</span> header.
          Retrieve your token from{' '}
          <Link to="/user/developer-settings" className="text-[#1A2744] font-semibold underline underline-offset-2">Developer Settings</Link>.
        </p>
        <CodeBlock title="header" code={`Authorization: YOUR_JWT_TOKEN\nContent-Type: application/json`} />
      </Section>

      {/* Create Payin */}
      <Section title="Create Payin Transaction">
        <p className="text-sm text-slate-600">Accept a payment from a customer. On success, you will receive a payment URL to redirect the customer.</p>

        <div className="flex items-center gap-2 text-sm">
          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-md">POST</span>
          <code className="font-mono text-slate-700 text-xs bg-slate-100 px-3 py-1.5 rounded-lg flex-1">{BASE_URL}/api/payments/payin</code>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Request Body</p>
          <CodeBlock title="json" code={`{
  "order_amount": 1000,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "reference_id": "TXN123456ABCD",
  "address": {
    "line1": "123 Main Street",
    "line2": "Apt 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }
}`} />
        </div>

        <ParamTable rows={[
          { param: 'order_amount',    type: 'number', required: 'Yes', desc: 'Amount in paise (₹10 = 1000 paise)' },
          { param: 'name',            type: 'string', required: 'Yes', desc: "Customer's full name" },
          { param: 'email',           type: 'string', required: 'Yes', desc: "Customer's email address" },
          { param: 'phone',           type: 'string', required: 'Yes', desc: "Customer's phone number (exactly 10 digits)" },
          { param: 'reference_id',    type: 'string', required: 'Yes', desc: 'Your unique order ID (12–25 alphanumeric characters)' },
          { param: 'address',         type: 'object', required: 'Yes', desc: "Customer's billing address object" },
          { param: 'address.pincode', type: 'string', required: 'Yes', desc: '6-digit postal/PIN code' },
          { param: 'address.line1',   type: 'string', required: 'No',  desc: 'Street address line 1' },
          { param: 'address.city',    type: 'string', required: 'No',  desc: 'City name' },
          { param: 'address.state',   type: 'string', required: 'No',  desc: 'State name' },
          { param: 'address.country', type: 'string', required: 'No',  desc: 'Country (default: India)' },
        ]} />

        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">cURL Example</p>
          <CodeBlock title="curl" code={`curl --location '${BASE_URL}/api/payments/payin' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: YOUR_JWT_TOKEN' \\
--data '{
  "order_amount": 1000,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "reference_id": "TXN123456ABCD",
  "address": { "pincode": "400001", "city": "Mumbai", "state": "Maharashtra" }
}'`} />
        </div>
      </Section>

      {/* Create Payout */}
      <Section title="Create Payout Transaction">
        <p className="text-sm text-slate-600">Transfer money directly to a bank account.</p>

        <div className="flex items-center gap-2 text-sm">
          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-md">POST</span>
          <code className="font-mono text-slate-700 text-xs bg-slate-100 px-3 py-1.5 rounded-lg flex-1">{BASE_URL}/api/payments/payout</code>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Request Body</p>
          <CodeBlock title="json" code={`{
  "amount": "1000",
  "account_number": "1234567890",
  "account_ifsc": "SBIN0001234",
  "bank_name": "State Bank of India",
  "beneficiary_name": "John Doe",
  "request_type": "IMPS",
  "reference_id": "PAYOUT123456ABCD"
}`} />
        </div>

        <ParamTable rows={[
          { param: 'amount',           type: 'string', required: 'Yes', desc: 'Amount in rupees as a string (e.g. "1000")' },
          { param: 'account_number',   type: 'string', required: 'Yes', desc: "Beneficiary's bank account number" },
          { param: 'account_ifsc',     type: 'string', required: 'Yes', desc: 'IFSC code of the beneficiary bank branch' },
          { param: 'bank_name',        type: 'string', required: 'Yes', desc: 'Name of the beneficiary bank' },
          { param: 'beneficiary_name', type: 'string', required: 'Yes', desc: 'Full name of the account holder' },
          { param: 'request_type',     type: 'string', required: 'Yes', desc: 'Transfer mode: IMPS | NEFT | RTGS' },
          { param: 'reference_id',     type: 'string', required: 'Yes', desc: 'Your unique payout ID (12–25 alphanumeric characters)' },
        ]} />

        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">cURL Example</p>
          <CodeBlock title="curl" code={`curl --location '${BASE_URL}/api/payments/payout' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: YOUR_JWT_TOKEN' \\
--data '{
  "amount": "1000",
  "account_number": "1234567890",
  "account_ifsc": "SBIN0001234",
  "bank_name": "State Bank of India",
  "beneficiary_name": "John Doe",
  "request_type": "IMPS",
  "reference_id": "PAYOUT123456ABCD"
}'`} />
        </div>
      </Section>

      {/* Transaction Status */}
      <Section title="Check Transaction Status">
        <p className="text-sm text-slate-600">Poll the status of any transaction using its reference ID.</p>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payin Status</p>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md">GET</span>
              <code className="font-mono text-slate-700 text-xs bg-slate-100 px-3 py-1.5 rounded-lg flex-1">{BASE_URL}/api/payments/payin/transaction/{'{transaction_id}'}</code>
            </div>
            <CodeBlock title="curl" code={`curl --location '${BASE_URL}/api/payments/payin/transaction/TXN123456ABCD' \\
--header 'Authorization: YOUR_JWT_TOKEN'`} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payout Status</p>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md">GET</span>
              <code className="font-mono text-slate-700 text-xs bg-slate-100 px-3 py-1.5 rounded-lg flex-1">{BASE_URL}/api/payments/payout/transaction/{'{transaction_id}'}</code>
            </div>
            <CodeBlock title="curl" code={`curl --location '${BASE_URL}/api/payments/payout/transaction/PAYOUT123456ABCD' \\
--header 'Authorization: YOUR_JWT_TOKEN'`} />
          </div>
        </div>
      </Section>

      {/* Balance Check */}
      <Section title="Check Account Balance">
        <p className="text-sm text-slate-600">Retrieve your current wallet balance and available limits.</p>
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md">GET</span>
          <code className="font-mono text-slate-700 text-xs bg-slate-100 px-3 py-1.5 rounded-lg flex-1">{BASE_URL}/api/payments/balanceCheck</code>
        </div>
        <CodeBlock title="curl" code={`curl --location '${BASE_URL}/api/payments/balanceCheck' \\
--header 'Authorization: YOUR_JWT_TOKEN'`} />
      </Section>

      {/* Webhooks */}
      <Section title="Webhook / Callback Notifications">
        <p className="text-sm text-slate-600">
          Shrivatsam sends an HTTP <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">POST</span> to your registered callback URL whenever a transaction status changes.
          Configure your URLs in{' '}
          <Link to="/user/developer-settings" className="text-[#1A2744] font-semibold underline underline-offset-2">Developer Settings</Link>.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payin Callback Payload</p>
            <p className="text-xs text-slate-400">Sent when a payin transaction is completed or failed.</p>
            <CodeBlock title="json" code={`{
  "reference_id": "TXN123456ABCD",
  "amount": "1000",
  "status": "completed",
  "utr": "UTR123456789",
  "message": "Transaction processed",
  "timestamp": "2026-06-21T10:30:00.000Z"
}`} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payout Callback Payload</p>
            <p className="text-xs text-slate-400">Sent when a payout transaction succeeds or fails.</p>
            <CodeBlock title="json" code={`{
  "reference_id": "PAYOUT123456ABCD",
  "amount": 1000,
  "status": "success",
  "utr": "UTR123456789",
  "message": "Transaction processed",
  "timestamp": "2026-06-21T10:30:00.000Z"
}`} />
          </div>
        </div>

        <FieldTable rows={[
          { field: 'reference_id', type: 'string', desc: 'Your unique reference ID sent at transaction creation' },
          { field: 'amount',       type: 'number', desc: 'Transaction amount' },
          { field: 'status',       type: 'string', desc: '"completed" / "failed" for payin; "success" / "failed" for payout' },
          { field: 'utr',          type: 'string', desc: 'Unique Transaction Reference from the bank. null if failed' },
          { field: 'message',      type: 'string', desc: 'Human-readable status message' },
          { field: 'timestamp',    type: 'string', desc: 'ISO 8601 timestamp of when the callback was sent' },
        ]} />

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-800">Best Practices</p>
          <ul className="list-disc pl-4 text-xs text-amber-700 space-y-1">
            <li>Always return a <span className="font-mono">200 OK</span> from your callback endpoint — Shrivatsam will retry on failure.</li>
            <li>Validate <span className="font-mono">reference_id</span> against your own records before updating status.</li>
            <li>Do not rely solely on callbacks — use the <strong>Check Transaction Status</strong> API as a fallback.</li>
            <li>Your endpoint must respond within <strong>5 seconds</strong>.</li>
          </ul>
        </div>
      </Section>

      {/* Notes */}
      <Section title="Notes & Requirements">
        <ul className="space-y-2 text-sm text-slate-600">
          {[
            <><span className="font-mono bg-slate-100 px-1 rounded text-xs">reference_id</span> must be 12–25 alphanumeric characters and unique per transaction.</>,
            'Amounts for payout should be sent as strings.',
            'Phone numbers must be exactly 10 digits (no country code).',
            <><span className="font-mono bg-slate-100 px-1 rounded text-xs">address.pincode</span> is the minimum required field inside the address object for payin.</>,
            <>Always include <span className="font-mono bg-slate-100 px-1 rounded text-xs">Content-Type: application/json</span> on all POST requests.</>,
            <>Get your JWT token from <Link to="/user/developer-settings" className="text-[#1A2744] font-semibold underline underline-offset-2">Developer Settings</Link>.</>,
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#D4AF37] flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

    </div>
  )
}
