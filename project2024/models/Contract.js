const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Định nghĩa schema cho Contract
const contractSchema = new Schema({
  contractNumber: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  licensePlate: {
    type: String,
    required: true
  },
  rentalStartDate: {
    type: Date,
    required: true
  },
  rentalEndDate: {
    type: Date,
    required: true
  },
  referees: [
    {
      name: { type: String, required: true },
      phone: { type: String, required: true }
    }
  ],
  images: [
    {
      type: String,
      required: true
    }
  ],
  status: {
    type: String,
    enum: ['Đang thuê', 'Quá hạn hợp đồng', 'Đã Đóng'],
    default: 'Đang thuê'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Tạo model từ schema và xuất nó ra ngoài
const Contract = mongoose.model('Contract', contractSchema);

module.exports = Contract;
