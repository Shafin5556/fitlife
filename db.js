const mysql = require('mysql');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', // Default to 'localhost' if not provided
    user: process.env.DB_USER || 'root',      // Default to 'root' if not provided
    password: process.env.DB_PASSWORD || '',  // Default to an empty string if no password is needed
    database: process.env.DB_NAME || 'fitlife', // Default to 'fitlife' if not provided
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Database connected successfully.');
    }
});

module.exports = db;
