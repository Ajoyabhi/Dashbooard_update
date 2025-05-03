const manageFundRequestSeed = [
  {
    user_id: 2,
    settlement_wallet: 5000.00,
    wallet_balance: 7500.00,
    reference_id: 'REF123456',
    from_bank: 'HDFC Bank',
    to_bank: 'ICICI Bank',
    payment_type: 'NEFT',
    remarks: 'Monthly deposit for business operations',
    reason: 'Business expenses and vendor payments',
    status: 'pending',
    created_by: 1,
    updated_by: 1
  },
  {
    user_id: 4,
    settlement_wallet: 2500.00,
    wallet_balance: 4000.00,
    reference_id: 'REF789012',
    from_bank: 'SBI Bank',
    to_bank: 'Axis Bank',
    payment_type: 'RTGS',
    remarks: 'Weekly settlement for vendor payments',
    reason: 'Vendor payment for inventory',
    status: 'approved',
    created_by: 1,
    updated_by: 1
  },
  {
    user_id: 6,
    settlement_wallet: 10000.00,
    wallet_balance: 15000.00,
    reference_id: 'REF345678',
    from_bank: 'Kotak Bank',
    to_bank: 'HDFC Bank',
    payment_type: 'IMPS',
    remarks: 'Emergency fund transfer',
    reason: 'Urgent business requirement',
    status: 'rejected',
    created_by: 1,
    updated_by: 1
  },
  {
    user_id: 3,
    settlement_wallet: 7500.00,
    wallet_balance: 10000.00,
    reference_id: 'REF901234',
    from_bank: 'ICICI Bank',
    to_bank: 'SBI Bank',
    payment_type: 'NEFT',
    remarks: 'Quarterly settlement',
    reason: 'Regular business operations',
    status: 'pending',
    created_by: 1,
    updated_by: 1
  },
  {
    user_id: 5,
    settlement_wallet: 3000.00,
    wallet_balance: 5000.00,
    reference_id: 'REF567890',
    from_bank: 'Axis Bank',
    to_bank: 'Kotak Bank',
    payment_type: 'RTGS',
    remarks: 'Monthly vendor payment',
    reason: 'Supplier payment for services',
    status: 'approved',
    created_by: 1,
    updated_by: 1
  }
];

module.exports = manageFundRequestSeed; 