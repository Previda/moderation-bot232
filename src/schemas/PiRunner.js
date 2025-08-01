const { Schema, model } = require('mongoose');

const piRunnerSchema = new Schema({
  guildID: { type: String, required: true },
  userID: { type: String, required: true },
  script: { type: String, required: true },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
  output: { type: String },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

module.exports = model('PiRunner', piRunnerSchema);
