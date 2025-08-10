// MySQL-based Punishment model and CRUD
const pool = require('../utils/mysql');

async function createPunishment({ userID, modID, reason, guildID, caseID, appealStatus = 'open' }) {
  const [result] = await pool.execute(
    'INSERT INTO punishments (userID, modID, reason, guildID, caseID, appealStatus) VALUES (?, ?, ?, ?, ?, ?)',
    [userID, modID, reason, guildID, caseID, appealStatus]
  );
  return result.insertId;
}

async function getPunishmentByCaseID(caseID) {
  const [rows] = await pool.execute('SELECT * FROM punishments WHERE caseID = ?', [caseID]);
  return rows[0] || null;
}

async function listPunishmentsByUser(userID, guildID) {
  const [rows] = await pool.execute('SELECT * FROM punishments WHERE userID = ? AND guildID = ?', [userID, guildID]);
  return rows;
}

module.exports = { createPunishment, getPunishmentByCaseID, listPunishmentsByUser };
