import { Pool } from 'pg';
import log from './logger';
import dotenv from 'dotenv';
dotenv.config({ path: './.env'});

const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: {
        rejectUnauthorized: false,
    }
});

export default { 
    query: (text: string, params?: any) => pool.query(text, params),
    testConnection: async () => {
        try {
            // Try to connect to the database
            const client = await pool.connect();
            log.info('Connection to PostgreSQL successful!');
            client.release(); // Release the client back to the pool
          } catch (error) {
            log.error(error);
          } finally {
            // Close the database connection
            // await pool.end();
          }
    }
}