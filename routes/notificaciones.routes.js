import express from 'express';
import { renderNotificaciones } from '../controllers/notificaciones.controller.js';
import { requireLogin } from '../middleware/auth.js';

const router = express.Router();

router.get('/notificaciones', requireLogin, renderNotificaciones);

export default router;