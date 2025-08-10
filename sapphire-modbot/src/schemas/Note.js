const { Schema, model } = require('mongoose');

const noteSchema = new Schema({
  userID: { type: String, required: true },
  modID: { type: String, required: true },
  note: { type: String, required: true },
  guildID: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = model('Note', noteSchema);
