const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  btag: { type: String },
  roles: [{ type: String, default: 'user' }],
  refreshTokens: [{ type: String }] // массив refresh токенов для мульти-устройств
});

module.exports = mongoose.model('User', userSchema); 