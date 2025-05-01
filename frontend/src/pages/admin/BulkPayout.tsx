import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminMenuItems } from '../../data/mockData';

export default function BulkPayout() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus('idle');
      setMessage('');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      setUploadStatus('error');
      setMessage('Please select a file to upload');
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock successful upload
      setUploadStatus('success');
      setMessage('File uploaded successfully. Processing payout requests...');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setUploadStatus('error');
      setMessage('Failed to upload file. Please try again.');
    }
  };

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Bulk Payout">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Bulk Payout Upload</h2>
              <p className="mt-1 text-sm text-gray-500">
                Upload your payout file to process multiple payouts at once
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {/* File Upload Area */}
              <div className="space-y-2">
                <label
                  htmlFor="file-upload"
                  className={`
                    relative block w-full p-12 text-center border-2 border-dashed rounded-lg
                    cursor-pointer hover:border-primary-500 focus:outline-none focus:ring-2
                    focus:ring-offset-2 focus:ring-primary-500 transition-colors
                    ${file ? 'border-primary-500 bg-primary-50' : 'border-gray-300'}
                  `}
                >
                  <div className="space-y-2">
                    <div className="flex justify-center">
                      <Upload className="h-12 w-12 text-gray-400" />
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-primary-600 hover:text-primary-500">
                        Click to upload
                      </span>
                      {' '}or drag and drop
                    </div>
                    {file ? (
                      <p className="text-sm text-gray-500">
                        Selected file: {file.name}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Any file format accepted
                      </p>
                    )}
                  </div>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                </label>

                {/* Status Message */}
                {message && (
                  <div
                    className={`flex items-center p-4 rounded-md ${
                      uploadStatus === 'success'
                        ? 'bg-success-50 text-success-800'
                        : 'bg-error-50 text-error-800'
                    }`}
                  >
                    {uploadStatus === 'success' ? (
                      <CheckCircle className="h-5 w-5 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 mr-2" />
                    )}
                    <span className="text-sm">{message}</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={!file || uploadStatus === 'success'}
                  className={`
                    inline-flex items-center px-6 py-3 border border-transparent rounded-md
                    shadow-sm text-base font-medium text-white
                    ${
                      !file || uploadStatus === 'success'
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                    }
                  `}
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload and Process
                </button>
              </div>
            </form>

            {/* Instructions */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900">Instructions</h3>
              <div className="mt-2 text-sm text-gray-500 space-y-2">
                <p>1. Prepare your payout file with the required format</p>
                <p>2. Upload the file using the form above</p>
                <p>3. Wait for the processing to complete</p>
                <p>4. Check the status in the payout reports section</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}