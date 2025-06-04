import express from 'express';
import { renderInformacion } from '../controllers/informacion.controller.js';
import { requireLogin } from '../middleware/auth.js';

const router = express.Router();

router.get('/informacion', requireLogin, renderInformacion);

export default router;