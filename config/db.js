// Configuración de la base de datos
// config/db.js
import pg from "pg";
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

const db = new pg.Client({
  connectionString,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

export default db;