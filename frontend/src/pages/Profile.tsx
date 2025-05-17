import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Building, Briefcase, Shield, CreditCard, Key } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';
import { toast } from 'react-hot-toast';
import { getMenuItems } from '../utils/menuItems';

interface ProfileData {
  id: number;
  name: string;
  user_name: string;
  email: string;
  mobile: string;
  user_type: string;
  company_name?: string;
  business_type?: string;
  status?: {
    status: boolean;
    payout_status: boolean;
    api_status: boolean;
    payin_status: boolean;
    payouts_status: boolean;
  };
  merchant_details?: {
    payin_merchant_assigned: string;
    payin_merchant_name: string;
    payout_merchant_assigned: string;
    payout_merchant_name: string;
    user_key: string;
    user_token: string;
    payin_callback: string;
    payout_callback: string;
  };
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        console.error('No user ID available');
        toast.error('User information not available');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching profile for user ID:', user.id);
        const response = await api.get('/api/profile');
        console.log('Profile API Response:', response.data);

        if (response.data) {
          setProfile(response.data);
        } else {
          console.error('No data received from API');
          toast.error('No profile data received');
        }
      } catch (error: any) {
        console.error('Error fetching profile:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        toast.error(error.response?.data?.message || 'Failed to load profile details');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  // Debug log for user context
  useEffect(() => {
    console.log('Current user context:', user);
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout menuItems={getMenuItems(user?.user_type || '')} title="Profile">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout menuItems={getMenuItems(user?.user_type || '')} title="Profile">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-gray-500">No profile data available</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout menuItems={getMenuItems(user?.user_type || '')} title="Profile">
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
            <h1 className="text-2xl font-bold text-gray-900">Profile Details</h1>
          </div>
        </div>

        {/* Profile Information */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="text-sm text-gray-900">{profile.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{profile.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Mobile</p>
                    <p className="text-sm text-gray-900">{profile.mobile || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">User Type</p>
                    <p className="text-sm text-gray-900 capitalize">{profile.user_type || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Company</p>
                    <p className="text-sm text-gray-900">{profile.company_name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Business Type</p>
                    <p className="text-sm text-gray-900">{profile.business_type || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Information */}
            {profile.status && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Account Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3">
                    <div className={`h-3 w-3 rounded-full ${profile.status.status ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Account Status</p>
                      <p className="text-sm text-gray-900">{profile.status.status ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`h-3 w-3 rounded-full ${profile.status.payout_status ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Payout Status</p>
                      <p className="text-sm text-gray-900">{profile.status.payout_status ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`h-3 w-3 rounded-full ${profile.status.api_status ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-500">API Status</p>
                      <p className="text-sm text-gray-900">{profile.status.api_status ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`h-3 w-3 rounded-full ${profile.status.payin_status ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Payin Status</p>
                      <p className="text-sm text-gray-900">{profile.status.payin_status ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Merchant Details */}
            {profile.merchant_details && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Merchant Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Payin Merchant</p>
                      <p className="text-sm text-gray-900">{profile.merchant_details.payin_merchant_name || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Payout Merchant</p>
                      <p className="text-sm text-gray-900">{profile.merchant_details.payout_merchant_name || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Key className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">User Key</p>
                      <p className="text-sm text-gray-900">{profile.merchant_details.user_key || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Key className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">User Token</p>
                      <p className="text-sm text-gray-900">{profile.merchant_details.user_token || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile; 