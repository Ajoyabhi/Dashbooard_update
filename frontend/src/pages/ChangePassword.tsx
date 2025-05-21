import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, CheckCircle, XCircle } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';
import { toast } from 'react-hot-toast';
import { getMenuItems } from '../utils/menuItems';

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState({
    passwordLength: false,
    hasUpperCase: false,
    hasNumber: false,
    passwordsMatch: false
  });



  // Get menu items based on user type
  const menuItems = getMenuItems(user?.user_type || '');


  useEffect(() => {
    // Password validation checks
    setValidation(prev => ({
      ...prev,
      passwordLength: formData.newPassword.length >= 8,
      hasUpperCase: /[A-Z]/.test(formData.newPassword),
      hasNumber: /[0-9]/.test(formData.newPassword),
      passwordsMatch: formData.newPassword === formData.confirmPassword && formData.newPassword !== ''
    }));
  }, [formData.newPassword, formData.confirmPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation.passwordsMatch) {
      toast.error('New passwords do not match');
      return;
    }

    if (!validation.passwordLength || !validation.hasUpperCase || !validation.hasNumber) {
      toast.error('Please ensure your password meets all requirements');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      toast.success('Password changed successfully');
      navigate(-1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const ValidationItem = ({ isValid, text }: { isValid: boolean; text: string }) => (
    <div className="flex items-center space-x-2 text-sm">
      {isValid ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
      <span className={isValid ? 'text-green-600' : 'text-red-600'}>{text}</span>
    </div>
  );

  return (
    <DashboardLayout menuItems={menuItems} title="Change Password">
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
            <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="currentPassword"
                    id="currentPassword"
                    required
                    placeholder="Enter current password"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="newPassword"
                    id="newPassword"
                    required
                    placeholder="Enter new password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm placeholder-gray-400"
                  />
                </div>
                {/* Password Requirements */}
                <div className="mt-2 space-y-1">
                  <ValidationItem isValid={validation.passwordLength} text="At least 8 characters long" />
                  <ValidationItem isValid={validation.hasUpperCase} text="Contains uppercase letter" />
                  <ValidationItem isValid={validation.hasNumber} text="Contains number" />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    required
                    placeholder="Confirm new password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`block w-full rounded-md shadow-sm sm:text-sm placeholder-gray-400 ${formData.confirmPassword
                      ? validation.passwordsMatch
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                        : 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                      }`}
                  />
                </div>
                {formData.confirmPassword && (
                  <div className="mt-2">
                    <ValidationItem
                      isValid={validation.passwordsMatch}
                      text={validation.passwordsMatch ? "Passwords match" : "Passwords do not match"}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !validation.passwordsMatch || !validation.passwordLength ||
                  !validation.hasUpperCase || !validation.hasNumber}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChangePassword; 