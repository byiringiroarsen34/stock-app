const mongoose = require("mongoose");

const SaleSchema = new mongoose.Schema({
  productName: String,
  stockType: Number,
  price: Number,
  quantity: Number, // ✅ ADD THIS
  date: String
});
module.exports = mongoose.model('Sale', SaleSchema);