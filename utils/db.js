
import mysql from 'mysql2/promise';
import fs from 'node:fs'; 
import path from 'node:path'; 



console.log('[DB INIT] DB_HOST from env:', process.env.DB_HOST);
console.log('[DB INIT] DB_USER from env:', process.env.DB_USER);

console.log('[DB INIT] DB_NAME from env:', process.env.DB_NAME);

let pool;

// --- SSL Configuration for Azure Database for MySQL ---
const sslOptions = {
    // rejectUnauthorized: true is the default and recommended for production.
    // It means the client will verify the server's certificate against a trusted CA.
    rejectUnauthorized: true, 
};


const caCertFileName = 'DigiCertGlobalRootG2.crt.pem';

const caCertPath = path.join(process.cwd(), 'certs', caCertFileName); 

try {
    if (fs.existsSync(caCertPath)) {
        sslOptions.ca = fs.readFileSync(caCertPath);
        console.log(`[DB SSL] Successfully loaded CA certificate from: ${caCertPath}`);
    } else {
        console.warn(`[DB SSL] WARNING: CA certificate not found at ${caCertPath}.`);
        console.warn('[DB SSL] Connection will proceed without custom CA, relying on system CAs.');
        console.warn('[DB SSL] This might lead to connection failures or be less secure if system CAs are insufficient for Azure MySQL.');

    }
} catch (err) {
    console.error(`[DB SSL] Error reading CA certificate from ${caCertPath}:`, err.message);
    console.warn('[DB SSL] Proceeding without custom CA due to error.');
}


try {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
        throw new Error('[DB CONFIG] Missing one or more critical database environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).');
    }

    pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5, 
        queueLimit: 0,
        connectTimeout: 20000,
        ssl: sslOptions // Apply SSL options
    });

    console.log('[DB] MySQL connection pool created. Attempting test query...');

    pool.query('SELECT 1 AS solution')
        .then(([rows]) => { 
            if (rows && rows.length > 0 && rows[0].solution === 1) {
                console.log('[DB] Bot successfully connected to MySQL and executed a test query.');
            } else {
                console.error('[DB] Bot connected to MySQL, but test query failed or returned an unexpected result:', rows);
            }
        })
        .catch(err => {
            console.error('[DB] Bot failed to connect to MySQL or execute test query after pool creation:', err.message);
            if (err.code) console.error(`[DB] MySQL Error Code: ${err.code}`);
        });

} catch (error) {
    console.error('[DB] CRITICAL: Failed to create MySQL pool. This usually indicates a problem with environment variables or a fundamental issue.', error.message);
    pool = null; // Ensure pool is null if creation fails
}

export default pool;