const fs = require('fs');
const path = require('path');
const STATUS_FILE = path.join(__dirname, '../../.botstatus.json');

function setUpdateStatus(updates, durationMs = 86400000) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify({ updates, until: Date.now() + durationMs }));
}

function getUpdateStatus() {
  if (!fs.existsSync(STATUS_FILE)) return null;
  const data = JSON.parse(fs.readFileSync(STATUS_FILE));
  if (Date.now() > data.until) return null;
  return data;
}

function clearUpdateStatus() {
  if (fs.existsSync(STATUS_FILE)) fs.unlinkSync(STATUS_FILE);
}

module.exports = { setUpdateStatus, getUpdateStatus, clearUpdateStatus };
