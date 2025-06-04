import db from "../config/db.js";
import { verifyPassword } from "../utils/passwordUtils.js";

export const renderVerify = (req, res) => {
  if (!req.session.username) return res.redirect('/register');
  res.render('verify.ejs', { error: null });
};

export const verifyCode = async (req, res) => {
  const username = req.session.username;
  const { code } = req.body;
  if (!username) return res.redirect('/register');

  const result = await db.query('SELECT verification_code_hash FROM users WHERE username = $1', [username]);
  if (result.rows.length === 0) {
    return res.render('verify.ejs', { error: 'Usuario no encontrado' });
  }

  const isValid = await verifyPassword(code, result.rows[0].verification_code_hash);
  if (!isValid) {
    return res.render('verify.ejs', { error: 'Código inválido' });
  }

  await db.query('UPDATE users SET is_verified = TRUE, verification_code_hash = NULL WHERE username = $1', [username]);
  req.session.destroy();
  res.redirect('/login');
};