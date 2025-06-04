import express from "express";
import { renderInicio, renderGames } from "../controllers/inicio.controller.js";
import { requireLogin } from "../middleware/auth.js";

const router = express.Router();

router.get(['/', '/inicio'], requireLogin, renderInicio);
router.get('/games', requireLogin, renderGames);

export default router;