const mysql = require('mysql2/promise');
require('dotenv').config(); // impératif

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'recettes',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'recettes',
  waitForConnections: true,
  connectionLimit: 10,
});
module.exports = pool;
