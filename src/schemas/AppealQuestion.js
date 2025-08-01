const { Schema, model } = require('mongoose');

const appealQuestionSchema = new Schema({
  guildID: { type: String, required: true },
  questions: { type: [String], default: [] }
});

module.exports = model('AppealQuestion', appealQuestionSchema);
