const Pool = require('pg').Pool;
const pool = new Pool({
    user: "postgres",
    password: "Root@123", 
    host: "localhost",
    database: "rehook",
    port: 5432
});

module.exports = pool;
  