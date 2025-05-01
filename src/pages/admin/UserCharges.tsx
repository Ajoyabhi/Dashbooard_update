import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Save, Trash } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../data/mockData';

interface ChargeRange {
  id: string;
  startAmount: number;
  endAmount: number;
  adminCharge: number;
  agentCharge: number;
  totalCharge: number;
  chargeType: 'percentage' | 'fixed';
}

interface PlatformCharge {
  id: string;
  charge: number;
  gst: number;
  date: string;
}

interface IPAddress {
  id: string;
  ip: string;
  date: string;
}

export default function UserCharges() {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [chargeRanges, setChargeRanges] = useState<ChargeRange[]>([]);
  const [platformCharges, setPlatformCharges] = useState<PlatformCharge[]>([]);
  const [ipAddresses, setIPAddresses] = useState<IPAddress[]>([]);
  
  // Modal states
  const [showPlatformChargeModal, setShowPlatformChargeModal] = useState(false);
  const [showIPModal, setShowIPModal] = useState(false);
  
  // Form states
  const [newChargeRange, setNewChargeRange] = useState<Partial<ChargeRange>>({
    chargeType: 'percentage'
  });
  const [newPlatformCharge, setNewPlatformCharge] = useState<Partial<PlatformCharge>>({});
  const [newIP, setNewIP] = useState<Partial<IPAddress>>({});

  const handleAddChargeRange = () => {
    if (newChargeRange.startAmount && newChargeRange.endAmount) {
      setChargeRanges([...chargeRanges, {
        id: Date.now().toString(),
        startAmount: newChargeRange.startAmount,
        endAmount: newChargeRange.endAmount,
        adminCharge: newChargeRange.adminCharge || 0,
        agentCharge: newChargeRange.agentCharge || 0,
        totalCharge: (newChargeRange.adminCharge || 0) + (newChargeRange.agentCharge || 0),
        chargeType: newChargeRange.chargeType || 'percentage'
      }]);
      setNewChargeRange({ chargeType: 'percentage' });
    }
  };

  const handleAddPlatformCharge = () => {
    if (newPlatformCharge.charge && newPlatformCharge.gst) {
      setPlatformCharges([...platformCharges, {
        id: Date.now().toString(),
        charge: newPlatformCharge.charge,
        gst: newPlatformCharge.gst,
        date: new Date().toISOString()
      }]);
      setShowPlatformChargeModal(false);
      setNewPlatformCharge({});
    }
  };

  const handleAddIP = () => {
    if (newIP.ip) {
      setIPAddresses([...ipAddresses, {
        id: Date.now().toString(),
        ip: newIP.ip,
        date: new Date().toISOString()
      }]);
      setShowIPModal(false);
      setNewIP({});
    }
  };

  return (
    <DashboardLayout menuItems={adminMenuItems} title="User Charges">
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
            <h1 className="text-2xl font-bold text-gray-900">User Charges</h1>
          </div>
        </div>

        {/* Charge Ranges */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Charge Ranges</h2>
            </div>
            
            {/* Add new charge range form */}
            <div className="mb-6 grid grid-cols-1 gap-6 bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Amount</label>
                  <input
                    type="number"
                    value={newChargeRange.startAmount || ''}
                    onChange={(e) => setNewChargeRange({
                      ...newChargeRange,
                      startAmount: parseFloat(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Amount</label>
                  <input
                    type="number"
                    value={newChargeRange.endAmount || ''}
                    onChange={(e) => setNewChargeRange({
                      ...newChargeRange,
                      endAmount: parseFloat(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Admin Charge</label>
                  <input
                    type="number"
                    value={newChargeRange.adminCharge || ''}
                    onChange={(e) => setNewChargeRange({
                      ...newChargeRange,
                      adminCharge: parseFloat(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Agent Charge</label>
                  <input
                    type="number"
                    value={newChargeRange.agentCharge || ''}
                    onChange={(e) => setNewChargeRange({
                      ...newChargeRange,
                      agentCharge: parseFloat(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Charge Type</label>
                  <select
                    value={newChargeRange.chargeType}
                    onChange={(e) => setNewChargeRange({
                      ...newChargeRange,
                      chargeType: e.target.value as 'percentage' | 'fixed'
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddChargeRange}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Range
                  </button>
                </div>
              </div>
            </div>

            {/* Charge ranges table */}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin Charge
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent Charge
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Charge
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chargeRanges.map((range) => (
                  <tr key={range.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {range.startAmount} - {range.endAmount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {range.adminCharge}{range.chargeType === 'percentage' ? '%' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {range.agentCharge}{range.chargeType === 'percentage' ? '%' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {range.totalCharge}{range.chargeType === 'percentage' ? '%' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="capitalize">{range.chargeType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setChargeRanges(chargeRanges.filter(r => r.id !== range.id))}
                        className="text-error-600 hover:text-error-900"
                      >
                        <Trash className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform Charges */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Platform Charges</h2>
              <button
                onClick={() => setShowPlatformChargeModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Platform Charge
              </button>
            </div>

            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Charge (%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GST (%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {platformCharges.map((charge) => (
                  <tr key={charge.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{charge.charge}%</td>
                    <td className="px-6 py-4 whitespace-nowrap">{charge.gst}%</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(charge.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setPlatformCharges(platformCharges.filter(c => c.id !== charge.id))}
                        className="text-error-600 hover:text-error-900"
                      >
                        <Trash className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* IP Addresses */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">IP Addresses</h2>
              <button
                onClick={() => setShowIPModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add IP Address
              </button>
            </div>

            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Added
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ipAddresses.map((ip) => (
                  <tr key={ip.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{ip.ip}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(ip.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setIPAddresses(ipAddresses.filter(i => i.id !== ip.id))}
                        className="text-error-600 hover:text-error-900"
                      >
                        <Trash className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Platform Charge Modal */}
      {showPlatformChargeModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Platform Charge</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Charge (%)</label>
                <input
                  type="number"
                  value={newPlatformCharge.charge || ''}
                  onChange={(e) => setNewPlatformCharge({
                    ...newPlatformCharge,
                    charge: parseFloat(e.target.value)
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">GST (%)</label>
                <input
                  type="number"
                  value={newPlatformCharge.gst || ''}
                  onChange={(e) => setNewPlatformCharge({
                    ...newPlatformCharge,
                    gst: parseFloat(e.target.value)
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPlatformChargeModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPlatformCharge}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IP Address Modal */}
      {showIPModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add IP Address</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">IP Address</label>
                <input
                  type="text"
                  value={newIP.ip || ''}
                  onChange={(e) => setNewIP({
                    ...newIP,
                    ip: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="xxx.xxx.xxx.xxx"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowIPModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddIP}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}