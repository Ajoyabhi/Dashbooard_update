import React, { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { agentMenuItems } from '../../data/mockData';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const RegisterUser: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        user_name: '',
        mobile: '',
        email: '',
        password: '',
        pan: '',
        aadhaar: '',
        user_type: 'payin_payout',
        company_name: '',
        gst_number: '',
        business_type: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
    });

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
            const response = await api.post('/agent/users-register', formData);
            if (response.status === 201) {
                toast.success('User registered successfully');
                navigate('/agent/add-users');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error registering user');
        }
    };

    return (
        <DashboardLayout menuItems={agentMenuItems} title="Register New User">
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
            />
            <div className="min-h-screen bg-gray-50">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h1 className="text-2xl font-semibold text-gray-900">Register New User</h1>
                        <button
                            onClick={() => navigate('/agent/add-users')}
                            className="text-gray-600 hover:text-gray-800"
                        >
                            Back to Users
                        </button>
                    </div>
    
                    {/* Form Card */}
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden w-full">
                        <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Form Fields */}
                                {[
                                    ['Name', 'name', 'text'],
                                    ['User Name', 'user_name', 'text'],
                                    ['Company Name', 'company_name', 'text'],
                                    ['Mobile', 'mobile', 'tel'],
                                    ['GST Number', 'gst_number', 'text'],
                                    ['Email', 'email', 'email'],
                                    ['Business Type', 'business_type', 'text'],
                                    ['Password', 'password', 'password'],
                                    ['Pan Card', 'pan', 'text'],
                                    ['Aadhar Card', 'aadhaar', 'text']
                                ].map(([label, name, type]) => (
                                    <div key={name}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                                        <input
                                            type={type}
                                            name={name}
                                            value={formData[name]}
                                            onChange={handleChange}
                                            placeholder={`Enter ${label}`}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            required
                                        />
                                    </div>
                                ))}
    
                                {/* User Type Select */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                                    <select
                                        name="user_type"
                                        value={formData.user_type}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    >
                                        <option value="payin_payout">Payin & Payout</option>
                                        <option value="payout_only">Payout Only</option>
                                    </select>
                                </div>
    
                                {/* Address */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Enter Address"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
    
                                {/* City / State / Pincode */}
                                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        ['City', 'city'],
                                        ['State', 'state'],
                                        ['Pincode', 'pincode']
                                    ].map(([label, name]) => (
                                        <div key={name}>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                                            <input
                                                type="text"
                                                name={name}
                                                value={formData[name]}
                                                onChange={handleChange}
                                                placeholder={`Enter ${label}`}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                required
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
    
                            {/* Action Buttons */}
                            <div className="mt-8 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                                <button
                                    type="button"
                                    onClick={() => navigate('/agent/add-users')}
                                    className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="w-full sm:w-auto px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                >
                                    Register User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default RegisterUser; 