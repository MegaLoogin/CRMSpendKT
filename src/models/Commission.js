const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  agency: { type: String, required: true, unique: true },
  percent: { type: Number, required: true, min: 0, max: 100 }
});

module.exports = mongoose.model('Commission', commissionSchema); 