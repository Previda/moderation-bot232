const { MessageAttachment } = require('discord.js');

async function generateTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  let transcript = '';
  for (const msg of sorted) {
    transcript += `[${new Date(msg.createdTimestamp).toLocaleString()}] ${msg.author.tag}: ${msg.content}\n`;
  }
  return transcript;
}

module.exports = { generateTranscript };
