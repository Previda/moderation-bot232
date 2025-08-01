const { Schema, model } = require('mongoose');

const ticketSchema = new Schema({
  guildID: { type: String, required: true },
  userID: { type: String, required: true },
  channelID: { type: String, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
  transcriptUrl: { type: String },
  participants: { type: [String], default: [] }
});

module.exports = model('Ticket', ticketSchema);
