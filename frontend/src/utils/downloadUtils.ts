import { formatCurrency, formatDate } from './formatUtils';
import * as XLSX from 'xlsx';

interface DownloadOptions {
    filename?: string;
    includeHeaders?: boolean;
    reportType?: 'payin' | 'payout';
}

export const downloadTableAsCSV = (
    data: any[],
    columns: any[],
    options: DownloadOptions = {}
) => {
    const {
        filename = 'report.xlsx',
        includeHeaders = true,
        reportType = 'payin'
    } = options;

    // Prepare worksheet data
    const worksheetData: any[] = [];

    // Add headers if needed
    if (includeHeaders) {
        const headers = columns.map(col => col.header);
        worksheetData.push(headers);
    }

    // Add data rows
    data.forEach(row => {
        const rowData: any = {};
        columns.forEach(col => {
            let value: any = '';

            // Handle nested properties
            if (col.accessor.includes('.')) {
                const keys = col.accessor.split('.');
                value = keys.reduce((obj: any, key: string) => obj?.[key], row) || '';
            } else {
                value = row[col.accessor] || '';
            }

            // Handle special cases for nested objects
            if (col.accessor === 'gateway_response') {
                value = value?.utr || '-';
            } else if (col.accessor === 'user') {
                value = value?.name || '-';
            } else if (col.accessor === 'beneficiary_details') {
                value = value?.beneficiary_name || '-';
            } else if (col.accessor === 'charges') {
                value = value?.admin_charge || 0;
            }

            // Handle net amount calculation based on report type
            if (col.header === 'Net Amount') {
                if (reportType === 'payin') {
                    const adminCharge = row.charges?.admin_charge || 0;
                    const gstAmount = row.gst_amount || 0;
                    const platformFee = row.platform_fee || 0;
                    value = row.amount - adminCharge - gstAmount - platformFee;
                } else if (reportType === 'payout') {
                    const adminCharge = row.charges?.admin_charge || 0;
                    const gstAmount = row.gst_amount || 0;
                    const platformFee = row.platform_fee || 0;
                    value = row.amount + adminCharge + gstAmount + platformFee;
                }
            }

            // Format the value based on column type
            if (typeof value === 'number') {
                // Format currency values
                if (col.header.toLowerCase().includes('amount') ||
                    col.header.toLowerCase().includes('charge') ||
                    col.header.toLowerCase().includes('fee') ||
                    col.header.toLowerCase().includes('balance')) {
                    value = formatCurrency(value).replace(/[₹,]/g, '');
                }
            } else if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
                // Format dates
                value = formatDate(value.toString());
            }

            rowData[col.header] = value;
        });
        worksheetData.push(rowData);
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData.slice(1), {
        header: worksheetData[0]
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

    // Generate Excel file
    XLSX.writeFile(workbook, filename);
}; 