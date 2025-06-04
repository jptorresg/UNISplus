import db from "../config/db.js";
import { hashPassword, verifyPassword } from "../utils/passwordUtils.js";
import { enviarCodigoVerificacion } from "../services/mailer.js";

export const renderLogin = (req, res) => {
  res.render('login.ejs', { error: null });
};

export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (!user.is_verified) {
        return res.render('login.ejs', { error: 'Debes verificar tu cuenta antes de iniciar sesión' });
      }
      const isValid = await verifyPassword(password, user.password_hash);
      if (isValid) {
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.isAdmin = user.is_admin;
        return res.redirect('/');
      }
    }
    res.render('login.ejs', { error: 'Usuario o contraseña incorrectos' });
  } catch (error) {
    console.error("Error en el login", error);
    res.status(500).render('login.ejs', { error: 'Error en el servidor' });
  }
};

export const renderRegister = (req, res) => {
  res.render('register.ejs', { error: null });
};

export const register = async (req, res) => {
  const { username, password, confirmPassword, name } = req.body;

  // Validaciones
  if (!username.endsWith('@unis.edu.gt')) {
    return res.render('register.ejs', { error: "Solamente se pueden registrar usuarios con el correo de la universidad", username, name });
  }
  if (username.length > 128 || name.length > 128) {
    return res.render('register.ejs', { error: "Usuario o nombre demasiado largos", username, name });
  }
  if (password.length < 8 || !/[!@#$%&*?/\\]/.test(password) || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return res.render('register.ejs', { error: "Contraseña insegura", username, name });
  }
  if (password !== confirmPassword) {
    return res.render('register.ejs', { error: "Las contraseñas no coinciden", username, name });
  }

  try {
    const userExists = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.render('register.ejs', { error: "El nombre de usuario ya está en uso", username, name });
    }

    const hashedPassword = await hashPassword(password);
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      return code;
    };

    const code = generateCode();
    const hashedCode = await hashPassword(code);

    await db.query(`
      INSERT INTO users (username, password_hash, name, is_verified, verification_code_hash)
      VALUES ($1, $2, $3, FALSE, $4)
    `, [username, hashedPassword, name, hashedCode]);

    const exito = await enviarCodigoVerificacion(username, name, code);
    if (!exito) {
      return res.status(500).send('Error al enviar el correo de verificación');
    }

    req.session.username = username;
    res.redirect('/verify');
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    res.status(500).send('Error interno del servidor');
  }
};

export const logout = (req, res) => {
  try {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    res.status(500).send("Error interno del servidor");
  }
};