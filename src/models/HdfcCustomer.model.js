const mongoose = require('mongoose');

const hdfcCustomerSchema = new mongoose.Schema(
  {
    phone:      { type: String, sparse: true, unique: true },
    email:      { type: String, sparse: true },
    customerId: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

hdfcCustomerSchema.index({ phone: 1 }, { unique: true, sparse: true });
hdfcCustomerSchema.index({ email: 1 }, { sparse: true });

module.exports = mongoose.model('HdfcCustomer', hdfcCustomerSchema);
