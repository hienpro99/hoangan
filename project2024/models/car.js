const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  name: String,
  brand: String,
  year: Number,
  available: Boolean
});

module.exports = mongoose.model('Car', carSchema);
