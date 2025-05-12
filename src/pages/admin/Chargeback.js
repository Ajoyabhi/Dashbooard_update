// import React, { useState } from 'react';
// import {
//   Box,
//   TextField,
//   Button,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Paper,
//   Typography,
//   Alert,
//   CircularProgress,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions
// } from '@mui/material';
// import axios from 'axios';

// const Chargeback = () => {
//   const [utrNumber, setUtrNumber] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [transaction, setTransaction] = useState(null);
//   const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });

//   const handleSearch = async () => {
//     if (!utrNumber.trim()) {
//       setError('Please enter UTR number');
//       return;
//     }

//     setLoading(true);
//     setError('');
//     setTransaction(null);

//     try {
//       const response = await axios.get(`/api/admin/chargeback?utr_number=${utrNumber}`, {
//         headers: {
//           'Authorization': `Bearer ${localStorage.getItem('token')}`
//         }
//       });
      
//       if (response.data.success) {
//         setTransaction(response.data.data);
//       } else {
//         setError(response.data.message || 'Error fetching transaction details');
//       }
//     } catch (error) {
//       if (error.response?.status === 401) {
//         setError('Session expired. Please login again.');
//         // Optionally redirect to login page
//         // window.location.href = '/login';
//       } else {
//         setError(error.response?.data?.message || 'Error fetching transaction details');
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleAction = async (action) => {
//     if (!transaction) return;

//     setConfirmDialog({ open: true, action });
//   };

//   const confirmAction = async () => {
//     const { action } = confirmDialog;
//     setConfirmDialog({ open: false, action: null });

//     try {
//       setLoading(true);
//       const response = await axios.post(
//         `/api/admin/chargeback/${transaction.id}/${action}`,
//         {},
//         {
//           headers: {
//             'Authorization': `Bearer ${localStorage.getItem('token')}`
//           }
//         }
//       );

//       if (response.data.success) {
//         setError('');
//         // Refresh the transaction data
//         handleSearch();
//       } else {
//         setError(response.data.message || `Error ${action}ing chargeback`);
//       }
//     } catch (error) {
//       if (error.response?.status === 401) {
//         setError('Session expired. Please login again.');
//         // Optionally redirect to login page
//         // window.location.href = '/login';
//       } else {
//         setError(error.response?.data?.message || `Error ${action}ing chargeback`);
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Box sx={{ p: 3 }}>
//       <Typography variant="h4" gutterBottom>
//         Chargeback Management
//       </Typography>

//       <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
//         <TextField
//           label="Enter UTR Number"
//           variant="outlined"
//           value={utrNumber}
//           onChange={(e) => setUtrNumber(e.target.value)}
//           sx={{ width: 300 }}
//           onKeyPress={(e) => {
//             if (e.key === 'Enter') {
//               handleSearch();
//             }
//           }}
//         />
//         <Button
//           variant="contained"
//           onClick={handleSearch}
//           disabled={loading}
//         >
//           {loading ? <CircularProgress size={24} /> : 'Search'}
//         </Button>
//       </Box>

//       {error && (
//         <Alert severity="error" sx={{ mb: 2 }}>
//           {error}
//         </Alert>
//       )}

//       {transaction && (
//         <>
//           <TableContainer component={Paper} sx={{ mb: 2 }}>
//             <Table>
//               <TableHead>
//                 <TableRow>
//                   <TableCell>Name</TableCell>
//                   <TableCell>Email</TableCell>
//                   <TableCell>Mobile</TableCell>
//                   <TableCell>Amount</TableCell>
//                   <TableCell>Admin Charges</TableCell>
//                   <TableCell>Reference ID</TableCell>
//                   <TableCell>Transaction Type</TableCell>
//                   <TableCell>Status</TableCell>
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 <TableRow>
//                   <TableCell>{transaction.name}</TableCell>
//                   <TableCell>{transaction.email}</TableCell>
//                   <TableCell>{transaction.mobile}</TableCell>
//                   <TableCell>{transaction.amount}</TableCell>
//                   <TableCell>{transaction.admin_charges}</TableCell>
//                   <TableCell>{transaction.reference_id}</TableCell>
//                   <TableCell>{transaction.transaction_type}</TableCell>
//                   <TableCell>{transaction.status}</TableCell>
//                 </TableRow>
//               </TableBody>
//             </Table>
//           </TableContainer>

//           <Box sx={{ display: 'flex', gap: 2 }}>
//             <Button
//               variant="contained"
//               color="success"
//               onClick={() => handleAction('accept')}
//               disabled={loading || transaction.status === 'chargeback_accepted' || transaction.status === 'chargeback_rejected'}
//             >
//               Accept
//             </Button>
//             <Button
//               variant="contained"
//               color="error"
//               onClick={() => handleAction('reject')}
//               disabled={loading || transaction.status === 'chargeback_accepted' || transaction.status === 'chargeback_rejected'}
//             >
//               Reject
//             </Button>
//           </Box>
//         </>
//       )}

//       <Dialog
//         open={confirmDialog.open}
//         onClose={() => setConfirmDialog({ open: false, action: null })}
//       >
//         <DialogTitle>
//           Confirm {confirmDialog.action === 'accept' ? 'Accept' : 'Reject'} Chargeback
//         </DialogTitle>
//         <DialogContent>
//           Are you sure you want to {confirmDialog.action} this chargeback?
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setConfirmDialog({ open: false, action: null })}>
//             Cancel
//           </Button>
//           <Button 
//             onClick={confirmAction}
//             color={confirmDialog.action === 'accept' ? 'success' : 'error'}
//             variant="contained"
//           >
//             Confirm
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </Box>
//   );
// };

// export default Chargeback; 