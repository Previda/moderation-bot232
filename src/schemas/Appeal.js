const { Schema, model } = require('mongoose');

const appealSchema = new Schema({
  caseID: { type: String, required: true },
  userID: { type: String, required: true },
  guildID: { type: String, required: true },
  answers: { type: [String], default: [] },
  status: { type: String, enum: ['open', 'closed', 'accepted', 'denied'], default: 'open' },
  reviewedBy: { type: String },
  reviewNote: { type: String },
  submittedAt: { type: Date, default: Date.now },
  closedAt: { type: Date }
});

module.exports = model('Appeal', appealSchema);
