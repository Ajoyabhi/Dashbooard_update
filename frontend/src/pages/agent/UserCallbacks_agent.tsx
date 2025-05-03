import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { agentMenuItems } from '../../data/mockData';
import api from '../../utils/axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface CallbackData {
    id: number;
    user_id: number;
    payin_callback: string;
    payout_callback: string;
    created_at: string;
    updated_at: string;
}

export default function UserCallbacks_agent() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [callbacks, setCallbacks] = useState<CallbackData | null>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        payin_callback: '',
        payout_callback: ''
    });

    useEffect(() => {
        fetchCallbacks();
    }, [userId]);

    const fetchCallbacks = async () => {
        try {
            const response = await api.get(`/agent/users/${userId}/callbacks`);
            setCallbacks(response.data);
            setFormData({
                payin_callback: response.data.payin_callback || '',
                payout_callback: response.data.payout_callback || ''
            });
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error fetching callbacks');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/agent/users/${userId}/callbacks`, formData);
            toast.success('Callbacks updated successfully');
            fetchCallbacks();
            setFormData({
                payin_callback: '',
                payout_callback: ''
            });
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error updating callbacks');
        }
    };

    if (loading) {
        return (
            <DashboardLayout menuItems={agentMenuItems} title="User Callbacks">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout menuItems={agentMenuItems} title="User Callbacks"> 
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
                        <h1 className="text-2xl font-bold text-gray-900">User Callbacks</h1>
                    </div>
                </div>

                {/* Callbacks Table */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Current Callback URLs</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Payin Callback</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{callbacks?.MerchantDetail?.payin_callback || 'Not set'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {callbacks?.updated_at ? new Date(callbacks.MerchantDetail.updated_at).toLocaleString() : 'Never'}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Payout Callback</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{callbacks?.MerchantDetail?.payout_callback || 'Not set'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {callbacks?.updated_at ? new Date(callbacks.MerchantDetail.updated_at).toLocaleString() : 'Never'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Callbacks Form */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Update Callback URLs</h2>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Payin Callback URL
                                </label>
                                <input
                                    type="url"
                                    name="payin_callback"
                                    value={formData.payin_callback}
                                    onChange={handleChange}
                                    placeholder="https://example.com/payin-callback"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    URL where payin transaction notifications will be sent
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Payout Callback URL
                                </label>
                                <input
                                    type="url"
                                    name="payout_callback"
                                    value={formData.payout_callback}
                                    onChange={handleChange}
                                    placeholder="https://example.com/payout-callback"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    URL where payout transaction notifications will be sent
                                </p>
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