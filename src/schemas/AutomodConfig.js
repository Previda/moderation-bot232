const { Schema, model } = require('mongoose');

const automodConfigSchema = new Schema({
  guildID: { type: String, required: true, unique: true },
  level: { type: String, enum: ['low', 'medium', 'high', 'custom'], default: 'medium' },
  antiSpam: { type: Boolean, default: true },
  antiInvite: { type: Boolean, default: true },
  antiNSFW: { type: Boolean, default: true },
  capsFlood: { type: Boolean, default: true },
  emojiFlood: { type: Boolean, default: true },
  autoWarn: { type: Boolean, default: true },
  autoMute: { type: Boolean, default: true },
  threatScore: { type: Boolean, default: true },
  logChannelId: { type: String, default: '' },
  muteDuration: { type: Number, default: 600 },
  warnThreshold: { type: Number, default: 3 },
  muteThreshold: { type: Number, default: 5 },
  custom: { type: Object, default: {} }
});

module.exports = model('AutomodConfig', automodConfigSchema);
