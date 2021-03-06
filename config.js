require('dotenv').config({path:__dirname + '/my.env'});

var config = {
  API_KEY: process.env.API_KEY || '',
  API_SECRET: process.env.API_SECRET || '',
  FROM_NUMBER: process.env.FROM_NUMBER || '',
  ALT_TO_NUMBER: process.env.ALT_TO_NUMBER || '',
  TO_NUMBER: process.env.TO_NUMBER || '',
  MEDIA_ID: process.env.MEDIA_ID || '',
  APP_ID: process.env.APP_ID || '',
  PRIVATE_KEY: process.env.PRIVATE_KEY || '',
  MONGO_DB: process.env.MONGO_DB || '',
  DEBUG: process.env.DEBUG === 'true'
};

// API_KEY and Secret now moved to heroku environmental variables for security

module.exports = config;
 