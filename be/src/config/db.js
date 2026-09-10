import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

export const getConnection = async () => {
  try {
    if (pool) {
      return pool;
    }
    pool = await sql.connect(config);
    console.log('✅ Database connected successfully');
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

export const query = async (queryString, params = {}) => {
  try {
    const pool = await getConnection();
    const request = pool.request();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        request.input(key, sql.VarChar, null);
      } else if (typeof value === 'number') {
        request.input(key, sql.Int, value);
      } else if (typeof value === 'string') {
        // If it's a pure numeric string, treat as Int
        if (/^-?\d+$/.test(value.trim())) {
          request.input(key, sql.Int, parseInt(value, 10));
        } else {
          request.input(key, sql.NVarChar, value);
        }
      } else if (value instanceof Date) {
        request.input(key, sql.DateTime, value);
      } else {
        request.input(key, value);
      }
    });

    console.log('🔍 Executing query:', queryString.substring(0, 100) + '...');
    return await request.query(queryString);
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    console.error('📝 Query:', queryString);
    console.error('📦 Params:', params);
    throw error;
  }
};

export default { getConnection, query };
