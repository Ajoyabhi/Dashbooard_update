// import React, { useState } from 'react';
// import {
//     Box,
//     Paper,
//     Table,
//     TableBody,
//     TableCell,
//     TableContainer,
//     TableHead,
//     TableRow,
//     TablePagination,
//     TextField,
//     Typography,
//     Grid,
//     MenuItem,
// } from '@mui/material';

// interface PayoutData {
//     transactionId: string;
//     type: string;
//     date: string;
//     user: string;
//     merchant: string;
//     amount: number;
//     charges: number;
//     balance: number;
//     status: string;
// }

// const PayoutReport: React.FC = () => {
//     const [page, setPage] = useState(0);
//     const [rowsPerPage, setRowsPerPage] = useState(10);
//     const [filters, setFilters] = useState({
//         transactionId: '',
//         type: '',
//         user: '',
//         merchant: '',
//         status: '',
//     });

//     // Sample data - replace with actual API call
//     const [data] = useState<PayoutData[]>([
//         {
//             transactionId: 'TRX001',
//             type: 'Payout',
//             date: '2024-03-20',
//             user: 'John Doe',
//             merchant: 'Merchant A',
//             amount: 1000.00,
//             charges: 10.00,
//             balance: 990.00,
//             status: 'Completed',
//         },
//         // Add more sample data as needed
//     ]);

//     const handleChangePage = (event: unknown, newPage: number) => {
//         setPage(newPage);
//     };

//     const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
//         setRowsPerPage(parseInt(event.target.value, 10));
//         setPage(0);
//     };

//     const handleFilterChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
//         setFilters({
//             ...filters,
//             [field]: event.target.value,
//         });
//     };

//     const filteredData = data.filter((row) => {
//         return (
//             row.transactionId.toLowerCase().includes(filters.transactionId.toLowerCase()) &&
//             row.type.toLowerCase().includes(filters.type.toLowerCase()) &&
//             row.user.toLowerCase().includes(filters.user.toLowerCase()) &&
//             row.merchant.toLowerCase().includes(filters.merchant.toLowerCase()) &&
//             row.status.toLowerCase().includes(filters.status.toLowerCase())
//         );
//     });

//     return (
//         <Box sx={{ p: 3 }}>
//             <Typography variant="h4" gutterBottom>
//                 Payout Report
//             </Typography>

//             {/* Filters */}
//             <Paper sx={{ p: 2, mb: 2 }}>
//                 <Grid container spacing={2}>
//                     <Grid item xs={12} sm={6} md={2}>
//                         <TextField
//                             fullWidth
//                             label="Transaction ID"
//                             value={filters.transactionId}
//                             onChange={handleFilterChange('transactionId')}
//                             size="small"
//                         />
//                     </Grid>
//                     <Grid item xs={12} sm={6} md={2}>
//                         <TextField
//                             fullWidth
//                             label="Type"
//                             value={filters.type}
//                             onChange={handleFilterChange('type')}
//                             size="small"
//                         />
//                     </Grid>
//                     <Grid item xs={12} sm={6} md={2}>
//                         <TextField
//                             fullWidth
//                             label="User"
//                             value={filters.user}
//                             onChange={handleFilterChange('user')}
//                             size="small"
//                         />
//                     </Grid>
//                     <Grid item xs={12} sm={6} md={2}>
//                         <TextField
//                             fullWidth
//                             label="Merchant"
//                             value={filters.merchant}
//                             onChange={handleFilterChange('merchant')}
//                             size="small"
//                         />
//                     </Grid>
//                     <Grid item xs={12} sm={6} md={2}>
//                         <TextField
//                             fullWidth
//                             label="Status"
//                             value={filters.status}
//                             onChange={handleFilterChange('status')}
//                             size="small"
//                         />
//                     </Grid>
//                 </Grid>
//             </Paper>

//             {/* Table */}
//             <TableContainer component={Paper}>
//                 <Table>
//                     <TableHead>
//                         <TableRow>
//                             <TableCell>Transaction ID</TableCell>
//                             <TableCell>Type</TableCell>
//                             <TableCell>Date</TableCell>
//                             <TableCell>User</TableCell>
//                             <TableCell>Merchant</TableCell>
//                             <TableCell align="right">Amount</TableCell>
//                             <TableCell align="right">Charges</TableCell>
//                             <TableCell align="right">Balance</TableCell>
//                             <TableCell>Status</TableCell>
//                         </TableRow>
//                     </TableHead>
//                     <TableBody>
//                         {filteredData
//                             .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
//                             .map((row) => (
//                                 <TableRow key={row.transactionId}>
//                                     <TableCell>{row.transactionId}</TableCell>
//                                     <TableCell>{row.type}</TableCell>
//                                     <TableCell>{row.date}</TableCell>
//                                     <TableCell>{row.user}</TableCell>
//                                     <TableCell>{row.merchant}</TableCell>
//                                     <TableCell align="right">${row.amount.toFixed(2)}</TableCell>
//                                     <TableCell align="right">${row.charges.toFixed(2)}</TableCell>
//                                     <TableCell align="right">${row.balance.toFixed(2)}</TableCell>
//                                     <TableCell>{row.status}</TableCell>
//                                 </TableRow>
//                             ))}
//                     </TableBody>
//                 </Table>
//                 <TablePagination
//                     rowsPerPageOptions={[5, 10, 25]}
//                     component="div"
//                     count={filteredData.length}
//                     rowsPerPage={rowsPerPage}
//                     page={page}
//                     onPageChange={handleChangePage}
//                     onRowsPerPageChange={handleChangeRowsPerPage}
//                 />
//             </TableContainer>
//         </Box>
//     );
// };

// export default PayoutReport;

import { useState } from 'react';
import { Calendar, Download } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/dashboard/Table';
import { adminMenuItems } from '../../data/mockData';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatUtils';

// Mock payout transactions
const mockPayoutTransactions = [
  {
    orderId: 'ORD-2025-001',
    transactionId: 'TXN123456',
    utr: 'UTR789012',
    name: 'John Smith',
    accountNo: '1234567890',
    ifsc: 'HDFC0001234',
    amount: 5000.00,
    charge: 50.00,
    gst: 9.00,
    netAmount: 4941.00,
    status: 'completed',
    date: '2025-01-15T10:30:00',
  },
  {
    orderId: 'ORD-2025-002',
    transactionId: 'TXN789012',
    utr: 'UTR345678',
    name: 'Sarah Wilson',
    accountNo: '0987654321',
    ifsc: 'ICIC0005678',
    amount: 2500.00,
    charge: 25.00,
    gst: 4.50,
    netAmount: 2470.50,
    status: 'pending',
    date: '2025-01-16T14:45:00',
  },
];

const AgentPayoutReport = () => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDateSubmit = async () => {
    if (!selectedDate) {
      window.showToast('error', 'Please select a date');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.showToast('success', 'Payout transactions fetched successfully');
    } catch (error) {
      window.showToast('error', 'Failed to fetch payout transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    // Handle report download
    console.log('Downloading report...');
  };

  const columns = [
    {
      header: 'Order ID',
      accessor: 'orderId',
      cell: (value: string) => (
        <span className="font-medium text-primary-600">{value}</span>
      ),
    },
    {
      header: 'Transaction ID',
      accessor: 'transactionId',
    },
    {
      header: 'UTR',
      accessor: 'utr',
    },
    {
      header: 'Name',
      accessor: 'name',
    },
    {
      header: 'A/C No',
      accessor: 'accountNo',
      cell: (value: string) => (
        <span className="font-mono">{value}</span>
      ),
    },
    {
      header: 'IFSC',
      accessor: 'ifsc',
      cell: (value: string) => (
        <span className="font-mono">{value}</span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Charge',
      accessor: 'charge',
      cell: (value: number) => (
        <span className="text-gray-600">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'GST',
      accessor: 'gst',
      cell: (value: number) => (
        <span className="text-gray-600">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Net Amount',
      accessor: 'netAmount',
      cell: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: 'date',
      cell: (value: string) => formatDate(value),
    },
  ];

  return (
    <DashboardLayout menuItems={adminMenuItems} title="Payout Report">
      <div className="space-y-6">
        {/* Date Filter */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 max-w-xs">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Select Date
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDateSubmit}
                disabled={loading}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {loading ? 'Loading...' : 'Submit'}
              </button>
              
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <Table
              columns={columns}
              data={mockPayoutTransactions}
              pagination={true}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgentPayoutReport;