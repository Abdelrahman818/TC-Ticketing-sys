const serverless = require('serverless-http');
const app = require('../../../API/app.js');

module.exports = serverless(app);
