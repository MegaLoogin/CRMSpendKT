const mongoose = require('mongoose');

const spendStatSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  btag: { type: String, required: true },
  offer_id: { type: Number, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  spend: { type: Number, required: true },
  commission: { type: Number, required: true }
});

module.exports = mongoose.model('SpendStat', spendStatSchema); 