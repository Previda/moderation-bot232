const ThreatScore = require('../schemas/ThreatScore');

module.exports = {
  async get(userId, guildId) {
    const doc = await ThreatScore.findOne({ userID: userId, guildID: guildId });
    return doc ? doc.score : 0;
  },
  async add(userId, guildId, amount = 1) {
    const doc = await ThreatScore.findOneAndUpdate(
      { userID: userId, guildID: guildId },
      { $inc: { score: amount }, $set: { lastUpdated: new Date() } },
      { upsert: true, new: true }
    );
    return doc.score;
  },
  async reset(userId, guildId) {
    await ThreatScore.deleteOne({ userID: userId, guildID: guildId });
  },
  async all(guildId) {
    return await ThreatScore.find({ guildID: guildId });
  }
};
