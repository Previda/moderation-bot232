const { Schema, model } = require('mongoose');

const threatScoreSchema = new Schema({
  userID: { type: String, required: true },
  guildID: { type: String, required: true },
  score: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

threatScoreSchema.index({ userID: 1, guildID: 1 }, { unique: true });

module.exports = model('ThreatScore', threatScoreSchema);
