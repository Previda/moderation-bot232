const { Schema, model } = require('mongoose');

const strikeSchema = new Schema({
  userID: { type: String, required: true },
  modID: { type: String, required: true },
  guildID: { type: String, required: true },
  reason: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  removed: { type: Boolean, default: false }
});

module.exports = model('Strike', strikeSchema);
