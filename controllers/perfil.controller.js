import db from "../config/db.js";
import { hashPassword, verifyPassword } from "../utils/passwordUtils.js";

export const renderPerfil = async (req, res) => {
    const userId = req.session.userId;

    // obtener los datos del usuario
    try {
        const result = await db.query(`
            SELECT name, description, profile_pic, background_pic
            FROM users
            WHERE id = $1
        `, [userId]);

        const user = result.rows[0];

        // renderizar la página de perfil
        res.render('perfil', {
            user
        });

    } catch (error) {
        console.error('Error al cargar el perfil:', error);
        res.status(500).send('Error al cargar el perfil');
    }
}

export const renderEditPerfil = async (req, res) => {
    const userId = req.session.userId;

    // obtener los datos del usuario
    try {
        const result = await db.query(`
            SELECT name, description, profile_pic, background_pic
            FROM users
            WHERE id = $1
        `, [userId]);

        const user = result.rows[0];

        // renderizar la página de edición de perfil
        res.render('editPerfil', {
            user
        });

    } catch (error) {
        console.error('Error al cargar el perfil:', error);
        res.status(500).send('Error al cargar el perfil');
    }
}

export const editPerfil = async (req, res) => {
    const userId = req.session.userId;
    const { name, description } = req.body;
    const profile_pic = req.files['profile_pic']?.[0]?.filename;
    const background_pic = req.files['background_pic']?.[0]?.filename;

    try {
        const fields = [];
        const values = [];
        let i = 1;

        if (name) {
            fields.push(`name = $${i++}`);
            values.push(name.trim());
        }
        if (description !== undefined) {
            fields.push(`description = $${i++}`);
            values.push(description.trim());
        }
        if (profile_pic) {
            fields.push(`profile_pic = $${i++}`);
            values.push(profile_pic);
        }
        if (background_pic) {
            fields.push(`background_pic = $${i++}`);
            values.push(background_pic);
        }

        if (fields.length > 0) {
            const query = `
                UPDATE users
                SET ${fields.join(', ')}
                WHERE id = $${i}
            `;
            values.push(userId);

            await db.query(query, values);
        }

        res.redirect('/perfil');

    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        res.status(500).send('Error al actualizar el perfil');
    }
}

export const renderChangePassword = async (req, res) => {
    res.render('changePassword');
}

export const changePassword = async (req, res) => {
    const { password, newPassword, confirmPassword } = req.body;
    const username = req.session.username;

    if (!username) {
        return res.status(401).send("No autorizado");
    }

    // Validar nueva contraseña
    if (newPassword.length < 8) {
        return res.render('changePassword.ejs', { error: "La nueva contraseña debe tener al menos 8 caracteres" });
    }
    if (!/[!@#$%&*?/\\]/.test(newPassword)) {
        return res.render('changePassword.ejs', { error: "La nueva contraseña debe incluir al menos uno de estos caracteres:! @ # $ % & * ? / \\" });
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return res.render('changePassword.ejs', { error: "La nueva contraseña debe incluir al menos una letra mayúscula, minúscula y un número" });
    }
    if (newPassword !== confirmPassword) {
        return res.render('changePassword.ejs', { error: "Las nuevas contraseñas no coinciden" });
    }

    try {
        // Buscar el usuario
        const result = await db.query('SELECT password_hash FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(404).send("Usuario no encontrado");
        }

        const storedHash = result.rows[0].password_hash;

        // Verificar contraseña actual
        const match = await verifyPassword(password, storedHash);
        if (!match) {
            return res.render('changePassword.ejs', { error: "La contraseña actual es incorrecta" });
        }

        // Hashear nueva contraseña
        const newHashed = await hashPassword(newPassword);

        // Actualizar en la base de datos
        await db.query('UPDATE users SET password_hash = $1 WHERE username = $2', [newHashed, username]);

        res.redirect('/perfil');
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).send("Error interno del servidor");
    }
}