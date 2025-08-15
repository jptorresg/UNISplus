// Configuración de la base de datos
// config/db.js
import pg from "pg";
import dotenv from 'dotenv';
dotenv.config();

let dbConfig;

if (process.env.DATABASE_URL) {
  // 🔹 Modo producción (Render)
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
  };
} else {
  // 🔹 Modo desarrollo (local)
  dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
  };
}

const db = new pg.Client(dbConfig);

export default db;
