// Superuser whitelist utility
const SUPERUSER_ID = '1340043754048061582';
function isSuperuser(userId) {
  return userId === SUPERUSER_ID;
}
module.exports = { isSuperuser, SUPERUSER_ID };
