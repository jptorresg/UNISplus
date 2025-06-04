import db from "../../config/db.js";

export const renderNewForo = async (req, res) => {
    res.render('newForo', {
        linkLeft: '/comunidad' ,
        iconLeft: 'fa-solid fa-chevron-left',
        leftFunction: '',
        linkRight: '',
        iconRight: 'fa-solid fa-check',
        rightFunction: ''
    });
};

export const newForo = async (req, res) => {
    const { title, description, isPrivate } = req.body;
    const userId = req.session.userId;

    if (!title) {
        return res.status(400).send('El título es obligatorio');//................................................................................
    }

    // imagen default para foros
    const imageUrl = req.file ? '/uploads/' + req.file.filename : '/images/foro_default_image.png';

    try {
        const isPrivateBool = isPrivate === 'on';

        // insertar el foro en la base de datos
        const foroResult = await db.query(
            'INSERT INTO foros (title, description, image, is_private) VALUES ($1, $2, $3, $4) RETURNING id',
            [title, description, imageUrl, isPrivateBool]
        );
        const foroId = foroResult.rows[0].id;

        // agregar el foro al usuario
        await db.query(
            'INSERT INTO foro_users (user_id, foro_id) VALUES ($1, $2)',
            [userId, foroId]
        );

        // rederigir al nuevo foro
        res.redirect('/comunidad?foro=' + foroId);

    } catch (error) {
        console.error('Error creando foro:', error);
        res.status(500).send('Error al crear foro');
    }
};

export const renderEditForo = async (req, res) => {
    const foroId = req.params.id;

    try {
        // seleccionar foro
        const result = await db.query('SELECT * FROM foros WHERE id = $1', [foroId]);

        // verificar existencia del foro
        if (result.rows.length === 0) {
            return res.status(404).send('Foro no encontrado');
        }

        const foro = result.rows[0];

        // renderizar página de edición de foro
        res.render('editForo', {
            foro,
            linkLeft: '/comunidad',
            iconLeft: 'fa-solid fa-chevron-left',
            leftFunction: '',
            linkRight: '',
            iconRight: 'fa-solid fa-check',
            rightFunction: 'submitForm()'
        });

    } catch (error) {
        console.error('Error al cargar foro:', error);
        res.status(500).send('Error al cargar foro');
    }
};

export const editForo = async (req, res) => {
    const foroId = req.params.id;
    const { title, description, isPrivate } = req.body;

    if (!title) {
        return res.status(400).send('El título es obligatorio');//................................................................................
    }

    // utilizar imagen original por defecto
    const imageUrl = req.file ? '/uploads/' + req.file.filename : null;
    const isPrivateBool = isPrivate === 'on';

    try {
        // construir query dinámica si hay imagen nueva
        let query = `
            UPDATE foros
            SET title = $1, description = $2, is_private = $3
            ${imageUrl ? ', image = $4' : ''}
            WHERE id = $${imageUrl ? 5 : 4}
        `;

        let params = imageUrl//...................................................................................................................
            ? [title, description, isPrivateBool, imageUrl, foroId]
            : [title, description, isPrivateBool, foroId];

        await db.query(query, params);

        // redirigir al mismo foro
        res.redirect('/comunidad?foro=' + foroId);

    } catch (error) {
        console.error('Error al actualizar foro:', error);
        res.status(500).send('Error al actualizar foro');
    }
};

export const deleteForo = async (req, res) => {
    const foroId = req.params.id;

    try {
        // eliminar referencias del usuario al foro
        await db.query('DELETE FROM foro_users WHERE foro_id = $1', [foroId]);

        // eliminar el foro
        await db.query('DELETE FROM foros WHERE id = $1', [foroId]);

        // redirigir a página de foros
        res.redirect('/foros');
    } catch (error) {
        console.error('Error al eliminar el foro:', error);
        res.status(500).send('Error al eliminar el foro');
    }
};

export const renderForos = async (req, res) => {
    const isAdmin = req.session.isAdmin;
    const userId = req.session.userId;

    try {
        let foros;

        if (isAdmin) {
            // los admins ven todos los foros
            foros = await db.query(`SELECT * FROM foros OFFSET 7`);
        } else {
            // los usuarios normales ven solo los foros a los que no están inscritos
            foros = await db.query(`
                SELECT * FROM foros 
                WHERE id NOT IN (
                    SELECT foro_id FROM foro_users WHERE user_id = $1
                )
                OFFSET 7
            `, [userId]);
        }

        // renderizar página de foros
        res.render('foros', {
            linkLeft: '/comunidad',
            iconLeft: 'fa-solid fa-chevron-left',
            linkRight: '',
            iconRight: '',
            usuario: req.session.usuario,
            foros: foros.rows,
            isAdmin
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error al cargar los foros");
    }
};

export const joinForo = async (req, res) => {
    const foroId = req.params.id;
    const userId = req.session.userId;

    try {
        // verificar existencia del foro
        const existe = await db.query(
            'SELECT * FROM foro_users WHERE foro_id = $1 AND user_id = $2',
            [foroId, userId]
        );

        // unirse al foro
        if (existe.rows.length === 0) {
            await db.query(
                'INSERT INTO foro_users (foro_id, user_id) VALUES ($1, $2)',
                [foroId, userId]
            );
        }

        // redirigir al nuevo foro
        res.redirect(`/comunidad?foro=${foroId}`);

    } catch (error) {
        console.error('Error al unirse al foro:', error);
        res.status(500).send('Error al unirse al foro');
    }
};

export const leaveForo = async (req, res) => {
    const foroId = req.params.id;
    const userId = req.session.userId;

    try {
        // salir del foro
        await db.query(
            'DELETE FROM foro_users WHERE foro_id = $1 AND user_id = $2',
            [foroId, userId]
        );

        // redirige a la vista general sin foro seleccionado
        res.redirect('/comunidad');
    } catch (error) {
        console.error('Error al salir del foro:', error);
        res.status(500).send('Error al salir del foro');
    }
};