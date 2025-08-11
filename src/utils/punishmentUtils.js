const { pool } = require('../models/database');
const { v4: uuidv4 } = require('uuid');

// Create a punishment record
async function createPunishment(data) {
    const { userID, modID, guildID, type, reason } = data;
    const caseID = 'CASE-' + uuidv4().slice(0, 6).toUpperCase();
    
    try {
        const [result] = await pool.execute(
            'INSERT INTO punishments (caseID, userID, modID, guildID, type, reason) VALUES (?, ?, ?, ?, ?, ?)',
            [caseID, userID, modID, guildID, type, reason]
        );
        
        return { caseID, id: result.insertId };
    } catch (error) {
        console.error('Error creating punishment:', error);
        throw error;
    }
}

// Get punishment by case ID
async function getPunishmentByCase(caseID) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM punishments WHERE caseID = ?',
            [caseID]
        );
        return rows[0] || null;
    } catch (error) {
        console.error('Error getting punishment:', error);
        throw error;
    }
}

// Get user's punishment history
async function getUserPunishments(userID, guildID) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM punishments WHERE userID = ? AND guildID = ? ORDER BY timestamp DESC',
            [userID, guildID]
        );
        return rows;
    } catch (error) {
        console.error('Error getting user punishments:', error);
        throw error;
    }
}

// Update appeal status
async function updateAppealStatus(caseID, status, reason = null) {
    try {
        await pool.execute(
            'UPDATE punishments SET appealStatus = ?, appealReason = ? WHERE caseID = ?',
            [status, reason, caseID]
        );
        return true;
    } catch (error) {
        console.error('Error updating appeal:', error);
        throw error;
    }
}

module.exports = {
    createPunishment,
    getPunishmentByCase,
    getUserPunishments,
    updateAppealStatus
};
