// Predefined automoderation levels
const levels = {
  low: {
    antiSpam: true,
    antiInvite: true,
    antiNSFW: true,
    capsFlood: false,
    emojiFlood: false,
    autoWarn: true,
    autoMute: false,
    threatScore: true,
    warnThreshold: 5,
    muteThreshold: 8,
    muteDuration: 300
  },
  medium: {
    antiSpam: true,
    antiInvite: true,
    antiNSFW: true,
    capsFlood: true,
    emojiFlood: true,
    autoWarn: true,
    autoMute: true,
    threatScore: true,
    warnThreshold: 3,
    muteThreshold: 5,
    muteDuration: 600
  },
  high: {
    antiSpam: true,
    antiInvite: true,
    antiNSFW: true,
    capsFlood: true,
    emojiFlood: true,
    autoWarn: true,
    autoMute: true,
    threatScore: true,
    warnThreshold: 1,
    muteThreshold: 2,
    muteDuration: 1800
  }
};

module.exports = {
  getLevel(level) {
    return levels[level] || levels['medium'];
  },
  levels
};
