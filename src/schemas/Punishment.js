const { Schema, model } = require('mongoose');

const punishmentSchema = new Schema({
  userID: { type: String, required: true },
  modID: { type: String, required: true },
  reason: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  guildID: { type: String, required: true },
  caseID: { type: String, required: true, unique: true },
  appealStatus: {
    type: String,
    enum: ['open', 'closed', 'accepted', 'denied'],
    default: 'open'
  }
});

module.exports = model('Punishment', punishmentSchema);
