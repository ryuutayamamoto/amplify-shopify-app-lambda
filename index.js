const serverless = require('serverless-http');
const express = require('express');

const app = express();

app.get('/', (req, res) => {
    res.send('Hello World');
});

const handler = serverless(app);

module.exports.handler = async (event, context) => {
  return await handler(event, context);
};

