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
              Welcome to ZentexPay API documentation. This guide will help you integrate our payment services into your application for both payin and payout operations.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">API Authentication</h2>
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-4">
              All API requests require authentication using a JWT token. The token is valid for 24 hours from the time of generation.
            </p>
            <div className="bg-gray-50 p-4 rounded-md">
              <code className="text-sm text-gray-800">
                Authorization: YOUR_JWT_TOKEN
              </code>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">API Endpoints</h2>
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Payin</h3>
              <p className="text-gray-600 mb-2">Create a new payment transaction</p>
              <div className="bg-gray-50 p-4 rounded-md">
                <code className="text-sm text-gray-800">
                  POST https://api.zentexpay.in/api/payments/payin
                </code>
              </div>
              <h4 className="text-gray-600 mb-2">Header</h4>
              <div className="bg-gray-50 p-4 rounded-md">
                <code className="text-sm text-gray-800">
                  'Authorization': 'YOUR_JWT_TOKEN',
                  'Content-Type': 'application/json'
                </code>
              </div>
              <div className="mt-4">
                <h4 className="text-md font-medium text-gray-800 mb-2">Request Body:</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm text-gray-800">
                  {`{
    "order_amount": "500",
    "email": "user@example.com",
    "phone": "9876543210",
    "name": "John Smith",
    "reference_id": "PAY123456789"
}`}
                </pre>
              </div>
              <div className="mt-4">
                <h4 className="text-md font-medium text-gray-800 mb-2">Response Body:</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm text-gray-800">
                  {`{
    "transaction_id": "64505324-607a-4f3d-b548-d639fb871c6c",
    "result": {
    "success": true,
    "reference_id": "123454789221",
    "payment_url": "upi:pay?mc=4900&pa=yespay.unps11809@yesbankltd&pn=Techturet%20technologies%20private%20limited&
                               am=100&tr=123454789221&cu=INR"
}`}
                </pre>
              </div>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Payout</h3>
              <p className="text-gray-600 mb-2">Initiate a payout transaction</p>
              <div className="bg-gray-50 p-4 rounded-md">
                <code className="text-sm text-gray-800">
                  POST https://api.zentexpay.in/api/payments/payout/
                </code>
              </div>
              <div className="mt-4">
                <h4 className="text-md font-medium text-gray-800 mb-2">Request Body:</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm text-gray-800">
                  {`{
    "amount": "2000",
    "account_number": "9876543210",
    "account_ifsc": "SBIN0001234",
    "bank_name": "State Bank of India",
    "beneficiary_name": "Jane Doe",
    "request_type": "IMPS",
    "reference_id": "POUT987654321"
}`}
                </pre>
              </div>
              <div className="mt-4">
                <h4 className="text-md font-medium text-gray-800 mb-2">Response Body:</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-sm text-gray-800">
                  {`{
    "success": true,
    "message": "Payout processed successfully",
    "transaction_id": "PAY20250521115348165",
    "result": "Transaction Successful"
}`}
                </pre>
              </div>
            </div>

            {/* Transaction Status Check Documentation */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Transaction Status Check</h3>

              {/* Payin Status Check */}
              <div className="mt-4">
                <h4 className="text-md font-medium text-gray-800 mb-2">Payin Status Check</h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <code className="text-sm text-gray-800">
                    GET https://api.zentexpay.in/api/payments/transaction/:transaction_id
                  </code>
                </div>
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-800 mb-2">Response Body:</h5>
                  <pre className="bg-gray-50 p-4 rounded-md text-sm text-gray-800">
                    {`{
    "success": true,
    "transaction": {
        "transaction_id": "64505324-607a-4f3d-b548-d639fb871c6c",
        "amount": "500",
        "status": "PENDING",
        "reference_id": "PAY123456789",
        "created_at": "2024-03-20T10:00:00Z",
        "updated_at": "2024-03-20T10:00:00Z",
        "gateway_response": {
            "statuscode": "TXN",
            "data": {
                "txnStatus": "PENDING"
            },
            "message": "Transaction is pending"
        }
    }
}`}
                  </pre>
                </div>
              </div>

              {/* Payout Status Check */}
              <div className="mt-4">
                <h4 className="text-md font-medium text-gray-800 mb-2">Payout Status Check</h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <code className="text-sm text-gray-800">
                    GET https://api.zentexpay.in/api/payments/payout/status/:transaction_id
                  </code>
                </div>
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-800 mb-2">Response Body:</h5>
                  <pre className="bg-gray-50 p-4 rounded-md text-sm text-gray-800">
                    {`{
    "success": true,
    "message": "Transaction status retrieved successfully",
    "transaction": {
        "transaction_id": "64505324-607a-4f3d-b548-d639fb871c6c",
        "status": "success",
        "utr": "469898155171",
        "amount": "2000",
        "gateway_response": {
            "statuscode": "TXN",
            "message": "Record found successfully",
            "txnid": "TEST15012010",
            "apitxnid": "TEST15012010",
            "utr": "469898155171",
            "status": "success",
            "amount": "2000"
        }
    }
}`}
                  </pre>
                </div>
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-800 mb-2">Error Response:</h5>
                  <pre className="bg-gray-50 p-4 rounded-md text-sm text-gray-800">
                    {`{
    "success": false,
    "message": "Transaction record not found",
    "transaction": {
        "transaction_id": "64505324-607a-4f3d-b548-d639fb871c6c",
        "status": "pending",
        "gateway_response": {
            "statuscode": "TXF",
            "message": "No record found"
        }
    }
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Important Notes</h2>
          <div className="prose max-w-none">
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>The reference_id can be any combination of 12 characters (numbers or alphabets)</li>
              <li>All amounts should be provided as strings</li>
              <li>Phone numbers must be exactly 10 digits</li>
              <li>Make sure to include the Content-Type: application/json header in your requests</li>
              <li>Transaction status can be: PENDING, SUCCESS, FAILED</li>
              <li>For payout transactions, UTR number will be provided in the response when transaction is successful</li>
            </ul>
          </div>
        </div>

        {/* <div className="bg-white p-6 rounded-lg shadow-card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Code Examples</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Node.js Example</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <pre className="text-sm text-gray-800">
                  {`const axios = require('axios');

// Payin API Status Result
 "transaction_id": "64505324-607a-4f3d-b548-d639fb871c6c",
    "result": {
        "success": true,
        "reference_id": "123454789221",
        "payment_url": "upi://pay?mc=4900&pa=yespay.unps11809@yesbankltd&pn=Techturet
         %20technologies%20private%20limited&am=100&tr=123454789221&cu=INR"

// Payout Example
const createPayout = async () => {
  try {
    {
   
    }
}
    }, {
      headers: {
        'Authorization': 'YOUR_JWT_TOKEN',
        'Content-Type': 'application/json'
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
        </div> */}
      </div>
    </DashboardLayout>
  );
}