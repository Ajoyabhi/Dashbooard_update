import React, { useState, useEffect } from 'react';
import { X, Download, Calendar } from 'lucide-react';
import { FilterOption } from '../../types';
import api from '../../utils/axios';

interface DownloadPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (filters: DownloadFilters) => void;
  title: string;
  statusOptions: FilterOption[];
  loading?: boolean;
}

export interface DownloadFilters {
  startDate: string;
  endDate: string;
  status: string;
  type?: string;
  user?: string;
}

interface UserOption {
  id: number;
  name: string;
  email: string;
  mobile: string;
  displayText: string;
}

interface DownloadPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (filters: DownloadFilters) => void;
  title: string;
  statusOptions: FilterOption[];
  typeOptions?: FilterOption[];
  loading?: boolean;
}

const DownloadPopup: React.FC<DownloadPopupProps> = ({
  isOpen,
  onClose,
  onDownload,
  title,
  statusOptions,
  typeOptions,
  loading = false
}) => {
  const [filters, setFilters] = useState<DownloadFilters>({
    startDate: '',
    endDate: '',
    status: 'all',
    type: 'all',
    user: ''
  });

  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDownload(filters);
  };

  // Fetch users for dropdown
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await api.get('/admin/users-dropdown');
      setUsers(response.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch users when popup opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const handleReset = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: 'all',
      type: 'all',
      user: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select User
              </label>
              <select
                value={filters.user}
                onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                disabled={usersLoading}
              >
                <option value="">All Users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayText}
                  </option>
                ))}
              </select>
              {usersLoading && (
                <p className="mt-1 text-xs text-gray-500">Loading users...</p>
              )}
            </div>

            {/* Transaction Type Filter (if provided) */}
            {typeOptions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                <Download className="h-4 w-4 mr-1" />
                {loading ? 'Downloading...' : 'Download'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DownloadPopup; 