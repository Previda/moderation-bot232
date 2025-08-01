const { Schema, model } = require('mongoose');

const inviteSchema = new Schema({
  code: { type: String, required: true, unique: true },
  guildID: { type: String, required: true },
  userID: { type: String, required: true },
  action: { type: String, enum: ['kick', 'ban', 'unban'], required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  used: { type: Boolean, default: false }
});

module.exports = model('Invite', inviteSchema);
