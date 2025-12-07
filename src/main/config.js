const path = require('node:path');
require('dotenv').config({ 
  path: path.join(__dirname, '../../.env'),
  quiet: true, 
});

const clientId = process.env.SPOTIFY_CLIENT_ID;
const redirectUri = `http://127.0.0.1:8080/callback`;

module.exports = {
  clientId,
  redirectUri,
};