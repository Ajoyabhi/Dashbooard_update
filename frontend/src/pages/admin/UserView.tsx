import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, ShieldCheck, BarChart3 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../data/mockData';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';

interface UserStatus {
    id: number;
    user_id: number;
    status: boolean;
    api_status: boolean;
    bank_deactive: boolean;
    iserveu: boolean;
    payin_status: boolean;
    payout_status: boolean;
    payouts_status: boolean;
    tecnical_issue: boolean;
    vouch: boolean;
    created_at: string;
    updated_at: string;
}

interface UserData {
    id: number;
    name: string;
    user_name: string;
    email: string;
    mobile: string;
    user_type: string;
    company_name: string;
    business_type: string;
    aadhaar_card: string | null;
    address: string | null;
    agent_id: number | null;
    city: string | null;
    gst_no: string | null;
    pancard: string | null;
    pin: string | null;
    pincode: string | null;
    state: string | null;
    created_at: string;
    updated_at: string;
    created_by: number;
    updated_by: number | null;
    remember_token: string | null;
    test_random_beneficiary?: boolean;
    payout_alert_enabled?: boolean;
    UserStatus: UserStatus;
}

export default function UserView() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserDetails();
    }, [userId]);

    const fetchUserDetails = async () => {
        try {
            const response = await api.get(`/admin/users/${userId}`);
            setUser(response.data);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error fetching user details');
        } finally {
            setLoading(false);
        }
    };

    const [togglingBeneficiary, setTogglingBeneficiary] = useState(false);

    const handleToggleTestBeneficiary = async () => {
        if (!user) return;
        const nextValue = !user.test_random_beneficiary;
        setTogglingBeneficiary(true);
        try {
            await api.patch(`/admin/users/${user.id}/test-beneficiary`, { enabled: nextValue });
            setUser({ ...user, test_random_beneficiary: nextValue });
            toast.success(`Random test beneficiary ${nextValue ? 'enabled' : 'disabled'}`);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error updating test beneficiary setting');
        } finally {
            setTogglingBeneficiary(false);
        }
    };

    const [togglingPayoutAlert, setTogglingPayoutAlert] = useState(false);

    const handleTogglePayoutAlert = async () => {
        if (!user) return;
        const nextValue = !user.payout_alert_enabled;
        setTogglingPayoutAlert(true);
        try {
            await api.patch(`/admin/users/${user.id}/payout-alert`, { enabled: nextValue });
            setUser({ ...user, payout_alert_enabled: nextValue });
            toast.success(`Payout alerts ${nextValue ? 'enabled' : 'disabled'}`);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error updating payout alert setting');
        } finally {
            setTogglingPayoutAlert(false);
        }
    };

    const formatWalletBalance = (balance: number | null | undefined) => {
        if (balance === null || balance === undefined) return '0.00';
        return balance.toFixed(2);
    };

    const formatStatus = (status: boolean | null | undefined) => {
        if (status === null || status === undefined) return 'Inactive';
        return status ? 'Active' : 'Inactive';
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <DashboardLayout menuItems={adminMenuItems} title="User Details">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </DashboardLayout>
        );
    }

    if (!user) {
        return (
            <DashboardLayout menuItems={adminMenuItems} title="User Details">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">User not found</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout menuItems={adminMenuItems} title="User Details">
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
                        <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => navigate(`/admin/manage-user/${userId}/analytics`)}
                            className="inline-flex items-center px-4 py-2 border border-indigo-600 rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <BarChart3 className="h-5 w-5 mr-2" />
                            Analytics
                        </button>
                        <button
                            onClick={() => navigate(`/admin/manage-user/${userId}/rolling-reserve`)}
                            className="inline-flex items-center px-4 py-2 border border-amber-600 rounded-md shadow-sm text-sm font-medium text-amber-600 bg-white hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                        >
                            <ShieldCheck className="h-5 w-5 mr-2" />
                            Rolling Reserve
                        </button>
                        <button
                            onClick={() => navigate(`/admin/manage-user/${userId}/edit`)}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            <Edit className="h-5 w-5 mr-2" />
                            Edit User
                        </button>
                    </div>
                </div>

                {/* User Information */}
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div className="p-6 space-y-6">
                        {/* Basic Information */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Name</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.name || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Username</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.user_name || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Email</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.email || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Mobile</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.mobile || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">User Type</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.user_type === 'admin' ? 'bg-primary-100 text-primary-800' :
                                            user.user_type === 'agent' ? 'bg-secondary-100 text-secondary-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                            {user.user_type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Business Information */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Business Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Company Name</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.company_name || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Business Type</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.business_type || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">GST Number</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.gst_no || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">PAN Card</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.pancard || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Aadhaar Card</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.aadhaar_card || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Address Information */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Address Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-500">Address</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.address || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">City</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.city || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">State</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.state || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">PIN Code</label>
                                    <div className="mt-1 text-sm text-gray-900">{user.pincode || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Account Status */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Account Status</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Status</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.UserStatus?.status ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                                            }`}>
                                            {formatStatus(user.UserStatus?.status)}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Payin</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.UserStatus?.payin_status ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                                            }`}>
                                            {user.UserStatus?.payin_status ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Payout</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.UserStatus?.payout_status ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                                            }`}>
                                            {user.UserStatus?.payout_status ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Additional Status Information */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Additional Status</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">API Status</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.UserStatus?.api_status ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                                            }`}>
                                            {user.UserStatus?.api_status ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Bank Status</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!user.UserStatus?.bank_deactive ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                                            }`}>
                                            {!user.UserStatus?.bank_deactive ? 'Active' : 'Deactivated'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Technical Issue</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!user.UserStatus?.tecnical_issue ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                                            }`}>
                                            {!user.UserStatus?.tecnical_issue ? 'No Issues' : 'Has Issues'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Testing Tools */}
                        <div className="border-t border-gray-200 pt-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Testing Tools</h2>
                            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <div className="pr-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900">Random Test Beneficiary</span>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.test_random_beneficiary ? 'bg-success-100 text-success-800' : 'bg-gray-200 text-gray-700'
                                            }`}>
                                            {user.test_random_beneficiary ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                        When enabled, this user's payin requests use a random test name, email and Indian mobile number instead of the submitted values. For testing only.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleToggleTestBeneficiary}
                                    disabled={togglingBeneficiary}
                                    role="switch"
                                    aria-checked={!!user.test_random_beneficiary}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${user.test_random_beneficiary ? 'bg-primary-600' : 'bg-gray-300'
                                        }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${user.test_random_beneficiary ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="border-t border-gray-200 pt-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Notifications</h2>
                            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <div className="pr-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900">Telegram Payout Alerts</span>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.payout_alert_enabled ? 'bg-success-100 text-success-800' : 'bg-gray-200 text-gray-700'
                                            }`}>
                                            {user.payout_alert_enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                        When enabled, a Telegram alert fires the first time this merchant makes a payout after a pause (longer than the configured window), plus an alert on any failed payout. It does not ping on every payout.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleTogglePayoutAlert}
                                    disabled={togglingPayoutAlert}
                                    role="switch"
                                    aria-checked={!!user.payout_alert_enabled}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${user.payout_alert_enabled ? 'bg-primary-600' : 'bg-gray-300'
                                        }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${user.payout_alert_enabled ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Timestamps */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Timestamps</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Created At</label>
                                    <div className="mt-1 text-sm text-gray-900">{formatDate(user.created_at)}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Updated At</label>
                                    <div className="mt-1 text-sm text-gray-900">{formatDate(user.updated_at)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
} 