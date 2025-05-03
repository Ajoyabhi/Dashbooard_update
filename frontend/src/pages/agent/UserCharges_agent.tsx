import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { agentMenuItems } from '../../data/mockData';
import api from '../../utils/axios';
import { toast } from 'react-toastify';

interface MerchantCharge {
    id: number;
    user_id: number;
    start_amount: string;
    end_amount: string;
    admin_payin_charge: string;
    admin_payout_charge: string;
    agent_payin_charge: string;
    agent_payout_charge: string;
    admin_payin_charge_type: string;
    admin_payout_charge_type: string;
    agent_payin_charge_type: string;
    agent_payout_charge_type: string;
    created_by: number;
    updated_by: number;
    created_at: string;
    updated_at: string;
}

interface UserData {
    id: number;
    name: string;
    user_name: string;
    mobile: string;
    email: string;
    company_name: string;
    MerchantCharges: MerchantCharge[];
}

export default function UserCharges_agent() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        payin_charge_type: 'percentage',
        payin_charge_value: '',
        payout_charge_type: 'percentage',
        payout_charge_value: '',
        start_amount: '',
        end_amount: ''
    });

    useEffect(() => {
        fetchUserCharges();
    }, [userId]);

    const fetchUserCharges = async () => {
        try {
            const response = await api.get(`/agent/users/${userId}/charges`);
            console.log(response.data);
            setUserData(response.data);
            if (response.data.MerchantCharges && response.data.MerchantCharges.length > 0) {
                const latestCharge = response.data.MerchantCharges[0];
                setFormData({
                    payin_charge_type: latestCharge.agent_payin_charge_type || 'percentage',
                    payin_charge_value: latestCharge.agent_payin_charge || '',
                    payout_charge_type: latestCharge.agent_payout_charge_type || 'percentage',
                    payout_charge_value: latestCharge.agent_payout_charge || '',
                    start_amount: latestCharge.start_amount || '',
                    end_amount: latestCharge.end_amount || ''
                });
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error fetching user charges');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/agent/users/${userId}/charges`, formData);
            toast.success('Charges updated successfully');
            fetchUserCharges();
            setFormData({
                payin_charge_type: 'percentage',
                payin_charge_value: '',
                payout_charge_type: 'percentage',
                payout_charge_value: '',
                start_amount: '',
                end_amount: ''  
            });
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error updating charges');
        }
    };

    if (loading) {
        return (
            <DashboardLayout menuItems={agentMenuItems} title="User Charges">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout menuItems={agentMenuItems} title="User Charges">
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

                {/* User Info */}
                {userData && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Name</p>
                                <p className="font-medium">{userData.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Company</p>
                                <p className="font-medium">{userData.company_name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Email</p>
                                <p className="font-medium">{userData.email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Mobile</p>
                                <p className="font-medium">{userData.mobile}</p>
                            </div>
                        </div>
                    </div>
                )}
                {/* Charges Summary Table */}
                {userData?.MerchantCharges && userData.MerchantCharges.length > 0 && (
                    <div className="bg-white shadow rounded-lg mt-6">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Charges Summary</h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Amount Range
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Payin Charge
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Payout Charge
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Last Updated
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {userData.MerchantCharges.map((charge) => (
                                            <tr key={charge.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {charge.start_amount} - {charge.end_amount}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {charge.agent_payin_charge} {charge.agent_payin_charge_type === 'percentage' ? '%' : 'units'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {charge.agent_payout_charge} {charge.agent_payout_charge_type === 'percentage' ? '%' : 'units'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(charge.updated_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Charges Form */}
                <div className="bg-white shadow rounded-lg">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Payin Charges Section */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900">Payin Charges</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payin Charge Type
                                    </label>
                                    <select
                                        name="payin_charge_type"
                                        value={formData.payin_charge_type}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="percentage">Percentage</option>
                                        <option value="fixed">Fixed Amount</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payin Charge Value {formData.payin_charge_type === 'percentage' ? '(%)' : '(Amount)'}
                                    </label>
                                    <input
                                        type="number"
                                        name="payin_charge_value"
                                        value={formData.payin_charge_value}
                                        onChange={handleChange}
                                        min="0"
                                        max={formData.payin_charge_type === 'percentage' ? "100" : undefined}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Payout Charges Section */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900">Payout Charges</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payout Charge Type
                                    </label>
                                    <select
                                        name="payout_charge_type"
                                        value={formData.payout_charge_type}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="percentage">Percentage</option>
                                        <option value="fixed">Fixed Amount</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payout Charge Value {formData.payout_charge_type === 'percentage' ? '(%)' : '(Amount)'}
                                    </label>
                                    <input
                                        type="number"
                                        name="payout_charge_value"
                                        value={formData.payout_charge_value}
                                        onChange={handleChange}
                                        min="0"
                                        max={formData.payout_charge_type === 'percentage' ? "100" : undefined}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Amount Range Section */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900">Amount Range</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Start Amount
                                    </label>
                                    <input
                                        type="number"
                                        name="start_amount"
                                        value={formData.start_amount}
                                        onChange={handleChange}
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        End Amount
                                    </label>
                                    <input
                                        type="number"
                                        name="end_amount"
                                        value={formData.end_amount}
                                        onChange={handleChange}
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                <Save className="h-5 w-5 mr-2" />
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>


            </div>
        </DashboardLayout>
    );
} 