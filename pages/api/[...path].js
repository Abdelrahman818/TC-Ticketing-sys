const serverless = require('serverless-http');
const app = require('@backend/app.js');

module.exports = serverless(app);
