import express from 'express';
import {
  renderLogin,
  login,
  renderRegister,
  register,
  logout
} from '../controllers/auth.controller.js';
import { 
    renderVerify, 
    verifyCode 
} from '../controllers/verify.controller.js';

const router = express.Router();

router.get('/login', renderLogin);
router.post('/login', login);
router.get('/register', renderRegister);
router.post('/register', register);
router.get('/verify', renderVerify);
router.post('/verify', verifyCode);
router.post('/logout', logout);

export default router;