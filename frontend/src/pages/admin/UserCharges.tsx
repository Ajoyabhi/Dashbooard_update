import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Save, Trash } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../data/mockData';
import axios from 'axios';
import api from '../../utils/axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ChargeRange {
  id: string;
  startAmount: number;
  endAmount: number;
  payinCharge: number;
  payoutCharge: number;
  payinchargeType: 'percentage' | 'fixed';
  payoutchargeType: 'percentage' | 'fixed';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showPlatformChargeModal, setShowPlatformChargeModal] = useState(false);
  const [showIPModal, setShowIPModal] = useState(false);

  // Form states
  const [newChargeRange, setNewChargeRange] = useState<Partial<ChargeRange>>({
    chargeType: 'percentage'
  });
  const [newPlatformCharge, setNewPlatformCharge] = useState<Partial<PlatformCharge>>({});
  const [newIP, setNewIP] = useState<Partial<IPAddress>>({});

  useEffect(() => {
    fetchCharges();
    fetchPlatformCharges();
    fetchIPAddresses();
  }, [userId]);

  const fetchCharges = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/users/${userId}/merchant-charges`);
      if (response.data.success) {
        const charges = response.data.data.map((charge: any) => ({
          id: charge.id.toString(),
          startAmount: parseFloat(charge.start_amount),
          endAmount: parseFloat(charge.end_amount),
          payinCharge: parseFloat(charge.admin_payin_charge),
          payoutCharge: parseFloat(charge.admin_payout_charge),
          payinchargeType: charge.admin_payin_charge_type || 'percentage',
          payoutchargeType: charge.admin_payout_charge_type || 'percentage',
          chargeType: charge.charge_type || 'percentage'
        }));
        setChargeRanges(charges);
        setError(null);
      } else {
        setError(response.data.message || 'Failed to fetch charges');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch charges');
      console.error('Error fetching charges:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformCharges = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/platform-charges`);
      if (response.data.success) {
        const charges = response.data.data.map((charge: any) => ({
          id: charge.id.toString(),
          charge: parseFloat(charge.charge),
          gst: parseFloat(charge.gst),
          date: new Date(charge.updated_at).toLocaleDateString()
        }));
        setPlatformCharges(charges);
        setError(null);
      } else {
        setError(response.data.message || 'Failed to fetch platform charges');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch platform charges');
      console.error('Error fetching platform charges:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIPAddresses = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/users/${userId}/ips`);
      if (response.data.success) {
        const ips = response.data.data.map((ip: any) => ({
          id: ip.id.toString(),
          ip: ip.ip_address,
          date: new Date(ip.updated_at).toLocaleDateString()
        }));
        setIPAddresses(ips);
      } else {
        setError(response.data.message || 'Failed to fetch IP addresses');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch IP addresses');
      console.error('Error fetching IP addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCharges = async () => {
    try {
      setLoading(true);
      const response = await api.put(`/admin/users/${userId}/merchant-charges`, {
        charges: chargeRanges.map(charge => ({
          start_amount: charge.startAmount,
          end_amount: charge.endAmount,
          admin_payin_charge: charge.payinCharge,
          admin_payout_charge: charge.payoutCharge,
          admin_payin_charge_type: charge.chargeType,
          admin_payout_charge_type: charge.chargeType
        }))
      });

      if (response.data.success) {
        setError(null);
        // Show success message
        alert('Charges saved successfully');
      } else {
        setError(response.data.message || 'Failed to save charges');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save charges');
      console.error('Error saving charges:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChargeRange = async () => {
    if (newChargeRange.startAmount && newChargeRange.endAmount) {
      // Validate that start amount is less than end amount
      if (newChargeRange.startAmount >= newChargeRange.endAmount) {
        setError('Start amount must be less than end amount');
        return;
      }

      try {
        setLoading(true);
        const response = await api.post(`/admin/users/${userId}/merchant-charges`, {
          start_amount: newChargeRange.startAmount,
          end_amount: newChargeRange.endAmount,
          admin_payin_charge: newChargeRange.payinCharge || 0,
          admin_payout_charge: newChargeRange.payoutCharge || 0,
          admin_payin_charge_type: newChargeRange.payinchargeType || 'percentage',
          admin_payout_charge_type: newChargeRange.payoutchargeType || 'percentage',
          charge_type: newChargeRange.chargeType || 'percentage',
        });

        if (response.data.success) {
          // Add the new charge to the local state
          setChargeRanges([...chargeRanges, {
            id: response.data.data.id.toString(),
            startAmount: newChargeRange.startAmount,
            endAmount: newChargeRange.endAmount,
            payinCharge: newChargeRange.payinCharge || 0,
            payoutCharge: newChargeRange.payoutCharge || 0,
            payinchargeType: newChargeRange.payinchargeType || 'percentage',
            payoutchargeType: newChargeRange.payoutchargeType || 'percentage',
            chargeType: newChargeRange.chargeType || 'percentage'
          }]);
          setNewChargeRange({ chargeType: 'percentage', payinchargeType: 'percentage', payoutchargeType: 'percentage' });
          toast.success('Charge range added successfully');
          fetchCharges();
          setError(null);
        } else {
          setError(response.data.message || 'Failed to add charge range');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to add charge range');
        console.error('Error adding charge range:', err);
      } finally {
        setLoading(false);
      }
    } else {
      setError('Please fill in all required fields');
    }
  };

  const handleAddPlatformCharge = async () => {
    if (newPlatformCharge.charge && newPlatformCharge.gst) {
      try {
        setLoading(true);
        const response = await api.post(`/admin/platform-charges`, {
          charge: newPlatformCharge.charge,
          gst: newPlatformCharge.gst
        });
        console.log(response.data);
        if (response.data.success) {
          setPlatformCharges([...platformCharges, {
            id: Date.now().toString(),
            charge: newPlatformCharge.charge,
            gst: newPlatformCharge.gst,
            date: new Date().toISOString()
          }]);
          setShowPlatformChargeModal(false);
          setNewPlatformCharge({});
          toast.success('Platform charge added successfully');
        } else {
          setError(response.data.message || 'Failed to add platform charge');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to add platform charge');
        console.error('Error adding platform charge:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddIP = async () => {
    try {
      setLoading(true);
      const response = await api.post(`/admin/users/${userId}/ips`, {
        ip_address: newIP.ip
      });
      if (response.data.success) {
        setIPAddresses([...ipAddresses, {
          id: Date.now().toString(),
          ip: newIP.ip || '',
          date: new Date(response.data.data.updated_at).toLocaleDateString()
        }]);
        setShowIPModal(false);
        setNewIP({});
        toast.success('IP address added successfully');
      } else {
        setError(response.data.message || 'Failed to add IP address');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add IP address');
      console.error('Error adding IP address:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChargeRange = async (rangeId: string) => {
    try {
      setLoading(true);
      await api.delete(`/admin/users/${userId}/merchant-charges/${rangeId}`);
      setChargeRanges(chargeRanges.filter(r => r.id !== rangeId));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete charge range');
      console.error('Error deleting charge range:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlatformCharge = async (chargeId: string) => {
    try {
      setLoading(true);
      await api.delete(`/admin/platform-charges/${chargeId}`);
      setPlatformCharges(platformCharges.filter(c => c.id !== chargeId));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete platform charge');
      console.error('Error deleting platform charge:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIP = async (ipId: string) => {
    try {
      setLoading(true);
      await api.delete(`/admin/users/${userId}/ips/${ipId}`);
      setIPAddresses(ipAddresses.filter(i => i.id !== ipId));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete IP address');
      console.error('Error deleting IP address:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout menuItems={adminMenuItems} title="User Charges">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        aria-label="Toast Container"
      />
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
          <button
            onClick={handleSaveCharges}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Charge Ranges */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Charge Ranges</h2>
            </div>

            {/* Add new charge range form */}
            <div className="mb-6 grid grid-cols-1 gap-6 bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-7 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700">Payin Charge</label>
                  <input
                    type="number"
                    value={newChargeRange.payinCharge || ''}
                    onChange={(e) => setNewChargeRange({
                      ...newChargeRange,
                      payinCharge: parseFloat(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payin Type</label>
                  <select
                    value={newChargeRange.payinchargeType || 'percentage'}
                    onChange={(e) => setNewChargeRange({
                      ...newChargeRange,
                      payinchargeType: e.target.value as 'percentage' | 'fixed'
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payout Charge</label>
                  <input
                    type="number"
                    value={newChargeRange.payoutCharge || ''}
                    onChange={(e) => setNewChargeRange({
                      ...newChargeRange,
                      payoutCharge: parseFloat(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payout Type</label>
                  <select
                    value={newChargeRange.payoutchargeType || 'percentage'}
                    onChange={(e) => setNewChargeRange({
                      ...newChargeRange,
                      payoutchargeType: e.target.value as 'percentage' | 'fixed'
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
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

            {/* Charge ranges table */}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payin Charge
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payin Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payout Charge
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payout Type
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
                      {range.payinCharge}{range.payinchargeType === 'percentage' ? '%' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="capitalize">{range.payinchargeType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {range.payoutCharge}{range.payoutchargeType === 'percentage' ? '%' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="capitalize">{range.payoutchargeType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteChargeRange(range.id)}
                        disabled={loading}
                        className="text-error-600 hover:text-error-900 disabled:opacity-50"
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
                        onClick={() => handleDeletePlatformCharge(charge.id)}
                        disabled={loading}
                        className="text-error-600 hover:text-error-900 disabled:opacity-50"
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
                        onClick={() => handleDeleteIP(ip.id)}
                        disabled={loading}
                        className="text-error-600 hover:text-error-900 disabled:opacity-50"
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