import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Key, Globe, Edit } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { adminMenuItems } from '../../data/mockData';

// Mock data for staff list
const mockStaff = [
  {
    id: 1,
    name: 'John Smith',
    mobile: '+1234567890',
    email: 'john.smith@example.com',
    status: 'active',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    mobile: '+0987654321',
    email: 'sarah.j@example.com',
    status: 'inactive',
  },
];

interface StaffMember {
  id: number;
  name: string;
  mobile: string;
  email: string;
  password?: string;
  panCard?: string;
  aadharCard?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  status: string;
}

interface IPAddress {
  id: string;
  ip: string;
  date: string;
}

export default function ManageStaff() {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showIPModal, setShowIPModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [ipAddresses, setIPAddresses] = useState<IPAddress[]>([]);
  const [newIP, setNewIP] = useState<string>('');
  
  const [formData, setFormData] = useState<Partial<StaffMember>>({
    name: '',
    mobile: '',
    email: '',
    password: '',
    panCard: '',
    aadharCard: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.mobile?.trim()) {
      errors.mobile = 'Mobile number is required';
    } else if (!/^\+?\d{10,12}$/.test(formData.mobile)) {
      errors.mobile = 'Invalid mobile number';
    }
    
    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }
    
    if (!formData.password?.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.pincode?.trim()) {
      errors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      errors.pincode = 'Invalid pincode';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Handle form submission
      console.log('Form submitted:', formData);
      setShowAddForm(false);
      setFormData({});
    }
  };

  const handleResetPassword = (staffId: number) => {
    // Handle password reset
    console.log('Reset password for staff:', staffId);
  };

  const handleIPWhitelisting = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setShowIPModal(true);
  };

  const handleAddIP = () => {
    if (newIP) {
      setIPAddresses([
        ...ipAddresses,
        {
          id: Date.now().toString(),
          ip: newIP,
          date: new Date().toISOString(),
        },
      ]);
      setNewIP('');
    }
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
    },
    {
      header: 'Mobile',
      accessor: 'mobile',
    },
    {
      header: 'Email',
      accessor: 'email',
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'active' ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: 'id',
      cell: (value: number, row: StaffMember) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleResetPassword(value)}
            className="text-warning-600 hover:text-warning-800"
            title="Reset Password"
          >
            <Key className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleIPWhitelisting(row)}
            className="text-primary-600 hover:text-primary-800"
            title="IP Whitelisting"
          >
            <Globe className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              setSelectedStaff(row);
              setFormData(row);
              setShowAddForm(true);
            }}
            className="text-secondary-600 hover:text-secondary-800"
            title="Edit Staff"
          >
            <Edit className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Manage Staff">
      <div className="space-y-6">
        {/* Staff Table */}
        {!showAddForm && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Staff List</h1>
              <button
                onClick={() => {
                  setSelectedStaff(null);
                  setFormData({});
                  setShowAddForm(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Staff
              </button>
            </div>

            <Table
              columns={columns}
              data={mockStaff}
              searchable={true}
              pagination={true}
            />
          </div>
        )}

        {/* Add/Edit Staff Form */}
        {showAddForm && (
          <div className="bg-white shadow-sm rounded-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        formErrors.name
                          ? 'border-error-300 focus:border-error-500 focus:ring-error-500'
                          : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-error-600">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile</label>
                    <input
                      type="text"
                      value={formData.mobile || ''}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        formErrors.mobile
                          ? 'border-error-300 focus:border-error-500 focus:ring-error-500'
                          : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                      }`}
                    />
                    {formErrors.mobile && (
                      <p className="mt-1 text-sm text-error-600">{formErrors.mobile}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        formErrors.email
                          ? 'border-error-300 focus:border-error-500 focus:ring-error-500'
                          : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                      }`}
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-sm text-error-600">{formErrors.email}</p>
                    )}
                  </div>

                  {!selectedStaff && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <input
                        type="password"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                          formErrors.password
                            ? 'border-error-300 focus:border-error-500 focus:ring-error-500'
                            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                        }`}
                      />
                      {formErrors.password && (
                        <p className="mt-1 text-sm text-error-600">{formErrors.password}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">PAN Card</label>
                    <input
                      type="text"
                      value={formData.panCard || ''}
                      onChange={(e) => setFormData({ ...formData, panCard: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Aadhar Card</label>
                    <input
                      type="text"
                      value={formData.aadharCard || ''}
                      onChange={(e) => setFormData({ ...formData, aadharCard: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">State</label>
                    <input
                      type="text"
                      value={formData.state || ''}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pincode</label>
                    <input
                      type="text"
                      value={formData.pincode || ''}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        formErrors.pincode
                          ? 'border-error-300 focus:border-error-500 focus:ring-error-500'
                          : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                      }`}
                    />
                    {formErrors.pincode && (
                      <p className="mt-1 text-sm text-error-600">{formErrors.pincode}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormData({});
                      setFormErrors({});
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                  >
                    {selectedStaff ? 'Update Staff' : 'Add Staff'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* IP Whitelisting Modal */}
        {showIPModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                IP Whitelisting - {selectedStaff?.name}
              </h3>
              
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newIP}
                    onChange={(e) => setNewIP(e.target.value)}
                    placeholder="Enter IP address"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                  <button
                    onClick={handleAddIP}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Add IP
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {ip.ip}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(ip.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => setIPAddresses(ipAddresses.filter((i) => i.id !== ip.id))}
                            className="text-error-600 hover:text-error-900"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => {
                      setShowIPModal(false);
                      setSelectedStaff(null);
                      setNewIP('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}