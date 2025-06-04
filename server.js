// server.js
// paquetes usados
import express from 'express';
import path from 'path';
import session from 'express-session';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import db from './config/db.js';
import { attachUsernameToViews } from './middleware/userSession.middleware.js';

import authRoutes from './routes/auth.routes.js';
import inicioRoutes from './routes/inicio.routes.js';
import informacionRoutes from './routes/informacion.routes.js';
import comunidadRoutes from './routes/comunidad.routes.js';
import notificacionRoutes from './routes/notificaciones.routes.js';
import perfilRoutes from './routes/perfil.routes.js';

dotenv.config();

// declaración de puerto
const app = express();
const PORT = process.env.PORT;

// declaración de __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// declaración de cookie
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie:{ secure: false } 
}));

await db.connect();

// middlewares
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(attachUsernameToViews);

app.use('/', authRoutes);
app.use('/inicio', inicioRoutes);
app.use('/informacion', informacionRoutes);
app.use('/comunidad', comunidadRoutes);
app.use('/notificaciones', notificacionRoutes);
app.use('/perfil', perfilRoutes);

// iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});