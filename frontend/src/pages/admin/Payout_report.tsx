import React, { useState } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    Typography,
    Grid,
    MenuItem,
} from '@mui/material';

interface PayoutData {
    transactionId: string;
    type: string;
    date: string;
    user: string;
    merchant: string;
    amount: number;
    charges: number;
    balance: number;
    status: string;
}

const PayoutReport: React.FC = () => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filters, setFilters] = useState({
        transactionId: '',
        type: '',
        user: '',
        merchant: '',
        status: '',
    });

    // Sample data - replace with actual API call
    const [data] = useState<PayoutData[]>([
        {
            transactionId: 'TRX001',
            type: 'Payout',
            date: '2024-03-20',
            user: 'John Doe',
            merchant: 'Merchant A',
            amount: 1000.00,
            charges: 10.00,
            balance: 990.00,
            status: 'Completed',
        },
        // Add more sample data as needed
    ]);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleFilterChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilters({
            ...filters,
            [field]: event.target.value,
        });
    };

    const filteredData = data.filter((row) => {
        return (
            row.transactionId.toLowerCase().includes(filters.transactionId.toLowerCase()) &&
            row.type.toLowerCase().includes(filters.type.toLowerCase()) &&
            row.user.toLowerCase().includes(filters.user.toLowerCase()) &&
            row.merchant.toLowerCase().includes(filters.merchant.toLowerCase()) &&
            row.status.toLowerCase().includes(filters.status.toLowerCase())
        );
    });

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Payout Report
            </Typography>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            fullWidth
                            label="Transaction ID"
                            value={filters.transactionId}
                            onChange={handleFilterChange('transactionId')}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            fullWidth
                            label="Type"
                            value={filters.type}
                            onChange={handleFilterChange('type')}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            fullWidth
                            label="User"
                            value={filters.user}
                            onChange={handleFilterChange('user')}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            fullWidth
                            label="Merchant"
                            value={filters.merchant}
                            onChange={handleFilterChange('merchant')}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            fullWidth
                            label="Status"
                            value={filters.status}
                            onChange={handleFilterChange('status')}
                            size="small"
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Transaction ID</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>User</TableCell>
                            <TableCell>Merchant</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell align="right">Charges</TableCell>
                            <TableCell align="right">Balance</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredData
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((row) => (
                                <TableRow key={row.transactionId}>
                                    <TableCell>{row.transactionId}</TableCell>
                                    <TableCell>{row.type}</TableCell>
                                    <TableCell>{row.date}</TableCell>
                                    <TableCell>{row.user}</TableCell>
                                    <TableCell>{row.merchant}</TableCell>
                                    <TableCell align="right">${row.amount.toFixed(2)}</TableCell>
                                    <TableCell align="right">${row.charges.toFixed(2)}</TableCell>
                                    <TableCell align="right">${row.balance.toFixed(2)}</TableCell>
                                    <TableCell>{row.status}</TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredData.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </TableContainer>
        </Box>
    );
};

export default PayoutReport;
