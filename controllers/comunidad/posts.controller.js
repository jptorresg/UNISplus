import db from "../../config/db.js";

export const renderNewPost = async (req, res) => {
    const foroId = req.params.foroId;
    res.render('newPost', {
        foroId,
        linkLeft: '',
        iconLeft: '',
        linkRight: '',
        iconRight: ''
    });
};

export const newPost = async (req, res) => {
    try {
        const { content } = req.body;
        const foroId = req.params.foroId;
        const userId = req.session.userId;

        // guardar la imagen con multer
        let imagePath = null;
        if (req.file) {
            imagePath = '/uploads/' + req.file.filename;
        }

        // validar que el contenido del post no esté vacío........................................................................................

        // insertar el post en la base de datos
        await db.query(`
            INSERT INTO posts (foro_id, user_id, content, image, created_at) 
            VALUES ($1, $2, $3, $4, NOW())
        `, [foroId, userId, content, imagePath]);        

        // redirige al foro correspondiente
        res.redirect('/comunidad?foro=' + foroId);

    } catch (error) {
        console.error('Error al publicar post:', error);
        res.status(500).send('Error al publicar post');
    }
}

export const renderEditPost = async (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;
    const isAdmin = req.session.isAdmin;

    try {
        // seleccionar post
        const result = await db.query('SELECT * FROM posts WHERE id = $1', [postId]);
        const post = result.rows[0];

        if (!post) {
            return res.status(404).send('Post no encontrado');
        }

        // solo dueño o admin pueden editar
        if (post.user_id !== userId && !isAdmin) {
            return res.status(403).send('No autorizado');
        }

        res.render('editPost', { post, foroId: post.foro_id });

    } catch (error) {
        console.error('Error al cargar post:', error);
        res.status(500).send('Error al cargar el post');
    }
}

export const editPost = async (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;
    const isAdmin = req.session.isAdmin;
    const { content, foroId } = req.body;

    try {
        // seleccionar post
        const result = await db.query('SELECT * FROM posts WHERE id = $1', [postId]);
        const post = result.rows[0];

        // verificar existencia del post
        if (!post) {
            return res.status(404).send('Post no encontrado');
        }

        // verificar quue sea dueño o usuario administrador
        if (post.user_id !== userId && !isAdmin) {
            return res.status(403).send('No autorizado');
        }

        let imagePath = post.image; // conservar imagen anterior por defecto
        if (req.file) {
            imagePath = '/uploads/' + req.file.filename;
        }

        // actualizar post
        await db.query(`
            UPDATE posts SET content = $1, image = $2 WHERE id = $3
        `, [content, imagePath, postId]);

        res.redirect('/comunidad?foro=' + foroId);

    } catch (error) {
        console.error('Error al editar post:', error);
        res.status(500).send('Error al editar post');
    }
}

export const deletePost = async (req, res) => {
   try {
        const postId = req.params.postId;
        const userId = req.session.userId;
        const isAdmin = req.session.isAdmin;

        // verificar que sea dueño o usuario administrador
        const result = await db.query('SELECT * FROM posts WHERE id = $1', [postId]);
        const post = result.rows[0];

        // verificar existencia del post
        if (!post) {
            return res.status(404).send('Post no encontrado');
        }

        // verificar que sea dueño o usuario administrador
        if (post.user_id !== userId && !isAdmin) {
            return res.status(403).send('No tienes permiso para eliminar este post');
        }

        // eliminar el post
        await db.query('DELETE FROM posts WHERE id = $1', [postId]);

        res.redirect('/comunidad?foro=' + post.foro_id);
    } catch (error) {
        console.error('Error al eliminar post:', error);
        res.status(500).send('Error al eliminar el post');
    }
}

export const likePost = async (req, res) => {
   const { postId } = req.params;
    const userId = req.session.userId;

    try {
        // seleccionar post
        const existing = await db.query(
            'SELECT * FROM post_likes WHERE user_id = $1 AND post_id = $2',
            [userId, postId]
        );

        // si ya tenia like, quitarlo
        if (existing.rows.length > 0) {
            await db.query('DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
        } 
        
        // si no tenia like, agregarlo
        else {
            await db.query('INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
        }

        // contar los likes a través de la base de datos
        const countResult = await db.query(
            'SELECT COUNT(*) FROM post_likes WHERE post_id = $1',
            [postId]
        );

        // renderizar contador de likes en posts
        const likes = parseInt(countResult.rows[0].count);
        res.json({ likes });
    } catch (error) {
        console.error('Error al dar/retirar like:', error);
        res.status(500).send('Error con el like');
    }
}