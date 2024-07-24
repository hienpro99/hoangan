// models/profile.js
const mongoose = require('mongoose');

// Định nghĩa Schema cho Profile
const profileSchema = new mongoose.Schema({
  contractNumber: {
    type: String,
    required: true,
    unique: true
  },
  cccd: { type: String, required: true, unique: true },
  fullname: { type: String, required: true },
  dob: { type: Date, required: true }
});

// Tạo model Profile từ schema đã định nghĩa
const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
