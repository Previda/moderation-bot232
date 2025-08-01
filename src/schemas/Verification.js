const { Schema, model } = require('mongoose');

const verificationSchema = new Schema({
  guildID: { type: String, required: true },
  userID: { type: String, required: true },
  code: { type: String },
  status: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date }
});

module.exports = model('Verification', verificationSchema);
