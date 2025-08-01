const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const AutomodConfig = require('../schemas/AutomodConfig');
const { getLevel } = require('../utils/automodLevels');
const urlRegex = /(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?/gi;
const inviteRegex = /discord\.gg\//i;
const nsfwRegex = /(porn|sex|nude|xxx|hentai|nsfw)/i; // Example only, should be more robust

// Threat score per user (in-memory, should be moved to DB for prod)
const threatScores = new Map();

function raiseThreat(userId, amount = 1) {
  const prev = threatScores.get(userId) || 0;
  threatScores.set(userId, prev + amount);
  return threatScores.get(userId);
}

module.exports = async (message, client) => {
  if (!message.guild || message.author.bot) return;

  // Fetch automod config for this guild
  let config = await AutomodConfig.findOne({ guildID: message.guild.id });
  if (!config) {
    // Default to medium if not set
    config = new AutomodConfig({ guildID: message.guild.id, ...getLevel('medium') });
    await config.save();
  }
  // Merge level settings unless custom
  const levelSettings = config.level !== 'custom' ? getLevel(config.level) : {};
  const mergedConfig = { ...levelSettings, ...config.toObject() };

  let actionTaken = false;
let threatScore = 0;

  // Anti-spam (simple: repeated messages)
  // TODO: Use better spam detection (per-user, per-channel, time window)
  // For now, just check for repeated messages in quick succession
  // ...

  // Anti-invite
  if (mergedConfig.antiInvite && inviteRegex.test(message.content)) {
    await message.delete().catch(() => {});
    actionTaken = true;
    raiseThreat(message.author.id, 2);
    await warnUser(message, 'Server invite links are not allowed.');
  }

  // Anti-NSFW
  if (mergedConfig.antiNSFW && nsfwRegex.test(message.content)) {
    await message.delete().catch(() => {});
    actionTaken = true;
    raiseThreat(message.author.id, 3);
    await warnUser(message, 'NSFW content is not allowed.');
  }

  // Caps flood
  if (mergedConfig.capsFlood && isCapsFlood(message.content)) {
    await message.delete().catch(() => {});
    actionTaken = true;
    raiseThreat(message.author.id, 1);
    await warnUser(message, 'Please do not use excessive caps.');
  }

  // Emoji flood
  if (mergedConfig.emojiFlood && isEmojiFlood(message.content)) {
    await message.delete().catch(() => {});
    actionTaken = true;
    raiseThreat(message.author.id, 1);
    await warnUser(message, 'Please do not spam emojis.');
  }

  // Threat score escalation
  if (actionTaken && mergedConfig.threatScore) {
    const tsUtil = require('../utils/threatScore');
    threatScore = await tsUtil.add(message.author.id, message.guild.id, 1);
    // Auto-warn
    if (mergedConfig.autoWarn && threatScore >= mergedConfig.warnThreshold) {
      await warnUser(message, `You have been warned by automod. Threat score: ${threatScore}`);
      // Optionally, log warning to mod-log or DB
    }
    // Auto-mute
    if (mergedConfig.autoMute && threatScore >= mergedConfig.muteThreshold) {
      if (message.guild.members.me.permissions.has('MuteMembers')) {
        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
        if (member && member.moderatable) {
          await member.timeout(mergedConfig.muteDuration * 1000, 'Automod: Threat score exceeded').catch(() => {});
          await warnUser(message, `You have been muted for ${mergedConfig.muteDuration} seconds due to repeated automod violations.`);
        }
      }
    }
  }

  // Log action
  if (actionTaken && mergedConfig.logChannelId) {
    const logChannel = message.guild.channels.cache.get(mergedConfig.logChannelId);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('Automod Action')
        .setDescription(`User: <@${message.author.id}>\nContent: ${message.content}`)
        .setColor('Red')
        .setTimestamp();
      logChannel.send({ embeds: [embed] });
    }
  }
};

function warnUser(message, reason) {
  return message.member.send(`You were warned: ${reason}`).catch(() => {});
}

function isCapsFlood(content) {
  const letters = content.replace(/[^A-Z]/g, '');
  return letters.length > 10 && letters.length / content.length > 0.7;
}

function isEmojiFlood(content) {
  const emojis = content.match(/<a?:\w+:\d+>|[\u{1F600}-\u{1F64F}]/gu);
  return emojis && emojis.length > 5;
}
