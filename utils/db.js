import mysql from 'mysql2/promise';


console.log('[DB INIT] Attempting to read DB_HOST:', process.env.DB_HOST);
console.log('[DB INIT] Attempting to read DB_USER:', process.env.DB_USER);

console.log('[DB INIT] Attempting to read DB_NAME:', process.env.DB_NAME);

let pool;

try {
    pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5, 
        queueLimit: 0,
        connectTimeout: 10000 
    });


    pool.query('SELECT 1 AS solution')
        .then(([rows, fields]) => {
            if (rows[0] && rows[0].solution === 1) {
                console.log('[DB] Bot successfully connected to MySQL and executed a test query.');
            } else {
                console.error('[DB] Bot connected to MySQL, but test query failed or returned unexpected result.');
            }
        })
        .catch(err => {
            console.error('[DB] Bot failed to connect to MySQL or execute test query during pool creation:', err.message);

        });

} catch (error) {
    console.error('[DB] CRITICAL: Failed to create MySQL pool. Check environment variables and DB server status.', error);
    pool = null;
}

export default pool;