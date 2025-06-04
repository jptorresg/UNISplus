import express from 'express';
import {
    renderPerfil,
    renderEditPerfil,
    editPerfil,
    renderChangePassword,
    changePassword
} from '../controllers/perfil.controller.js';
import { requireLogin } from '../middleware/auth.js';
import upload from '../middleware/multerConfig.js';

const router = express.Router();

router.get('/perfil', requireLogin, renderPerfil);
router.get('/editPerfil', requireLogin, renderEditPerfil);
router.post('/perfil/editar', requireLogin, upload.fields([{ name: 'profile_pic', maxCount: 1 },{ name: 'background_pic', maxCount: 1 }]), editPerfil); //wtf?
router.get('/perfil/changePassword', requireLogin, renderChangePassword);
router.post('/perfil/changePassword', requireLogin, changePassword);

export default router;