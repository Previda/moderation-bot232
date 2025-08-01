const Ticket = require('../schemas/Ticket');

module.exports = async (client) => {
  setInterval(async () => {
    const now = Date.now();
    const cutoff = now - 1000 * 60 * 60 * 24 * 2; // 2 days inactivity
    const tickets = await Ticket.find({ status: 'open' });
    for (const ticket of tickets) {
      const channel = client.channels.cache.get(ticket.channelID);
      if (!channel) continue;
      const lastMsg = (await channel.messages.fetch({ limit: 1 })).first();
      if (lastMsg && lastMsg.createdTimestamp < cutoff) {
        ticket.status = 'closed';
        ticket.closedAt = new Date();
        await ticket.save();
        await channel.send('Ticket closed due to inactivity.');
        await channel.permissionOverwrites.edit(ticket.userID, { ViewChannel: false });
      }
    }
  }, 1000 * 60 * 60); // Run hourly
};
