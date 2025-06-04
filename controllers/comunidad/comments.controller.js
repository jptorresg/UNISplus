import db from "../../config/db.js";
import { formatRelativeDate } from "../../utils/dateUtils.js";

export const renderComments = async (req, res) => {
    const postId = req.params.id;
    const userId = req.session.userId;

    try {
        // obtener el post original
        const postResult = await db.query(`
            SELECT 
                p.*, 
                u.name AS user_name, 
                u.profile_pic,
                EXISTS (
                    SELECT 1 
                    FROM post_likes 
                    WHERE post_id = p.id AND user_id = $2
                ) AS liked,
                (
                    SELECT COUNT(*) 
                    FROM post_likes 
                    WHERE post_id = p.id
                ) AS like_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = $1
        `, [postId, userId]);

        const post = postResult.rows[0];

        // obtener los comentarios del post
        const comentariosResult = await db.query(`
            SELECT 
                c.*, 
                u.name AS user_name, 
                u.profile_pic,
                EXISTS (
                    SELECT 1 FROM comment_likes 
                    WHERE comment_id = c.id AND user_id = $2
                ) AS liked,
                (
                    SELECT COUNT(*) FROM comment_likes 
                    WHERE comment_id = c.id
                ) AS like_count
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC
        `, [postId, userId]);

            // mapear los comentarios
            const comentarios = comentariosResult.rows.map(c => ({
                ...c,
                profilePic: c.profile_pic 
                    ? `/uploads/${c.profile_pic}`
                    : "/images/default_profile_image.jpg",
                date: formatRelativeDate(c.created_at),
                likes: parseInt(c.like_count) || 0,
                liked: c.liked
            }));            

        // renderizar los comentarios
        res.render('comments', {
            post: {
                ...post,
                profilePic: post.profile_pic 
                    ? `/uploads/${post.profile_pic}`
                    : "/images/default_profile_image.jpg",
                date: formatRelativeDate(post.created_at),
                likes: parseInt(post.like_count) || 0
            },            
            comentarios,
            foroId: post.foro_id,
            usuario: req.usuario,
            userId: req.session.userId,
            isAdmin: req.session.isAdmin,
        });

    } catch (err) {
        console.error("Error al cargar los comentarios:", err);
        res.status(500).send("Error al cargar los comentarios");
    }
}

export const addComment = async (req, res) => {
    const postId = req.params.postId;
    const userId = req.session.userId;
    const { content } = req.body;

    if (!content.trim()) {
        return res.redirect(`/post/${postId}/comments`);
    }

    try {
        await db.query(`
            INSERT INTO comments (post_id, user_id, content, created_at)
            VALUES ($1, $2, $3, NOW())
        `, [postId, userId, content]);

        res.redirect(`/post/${postId}/comments`);
    } catch (error) {
        console.error('Error al insertar comentario:', error);
        res.status(500).send('Error al comentar');
    }
}

export const renderEditComment = async (req, res) => {
    const commentId = req.params.commentId;
    const userId = req.session.userId;
    const isAdmin = req.session.isAdmin;

    try {
        // traer comentario
        const result = await db.query('SELECT * FROM comments WHERE id = $1', [commentId]);
        const comentario = result.rows[0];

        // verificar existencia del comentario
        if (!comentario) {
            return res.status(404).send('Comentario no encontrado');
        }

        // verificar que sea el dueño o usuario administrador
        if (comentario.user_id !== userId && !isAdmin) {
            return res.status(403).send('No autorizado');
        }

        // renderizar página de edición de comentario
        res.render('editComment', {
            linkLeft: '/post/' + comentario.post_id + '/comments',
            iconLeft: 'fa-solid fa-chevron-left',
            leftFunction: '',
            linkRight: 'fa-solid fa-check',
            iconRight: 'submitEditForm()',
            rightFunction: '',
            rightExtraClass: '',
            
            comentario
        });
    } catch (error) {
        console.error('Error al obtener comentario:', error);
        res.status(500).send('Error del servidor');
    }
}

export const editComment = async (req, res) => {
    const commentId = req.params.commentId;
    const { content } = req.body;
    const userId = req.session.userId;
    const isAdmin = req.session.isAdmin;

    try {
        // traer comentario
        const result = await db.query('SELECT * FROM comments WHERE id = $1', [commentId]);
        const comentario = result.rows[0];

        // verificar existencia del comentario
        if (!comentario) {
            return res.status(404).send('Comentario no encontrado');
        }

        // verificar que sea el dueño o un usuario administrador
        if (comentario.user_id !== userId && !isAdmin) {
            return res.status(403).send('No autorizado');
        }

        // actualizar comentario
        await db.query('UPDATE comments SET content = $1 WHERE id = $2', [content.trim(), commentId]);

        res.redirect(`/post/${comentario.post_id}/comments`);
    } catch (error) {
        console.error('Error al editar comentario:', error);
        res.status(500).send('Error al editar comentario');
    }
}

export const deleteComment = async (req, res) => {
    const commentId = req.params.commentId;
    const userId = req.session.userId;
    const isAdmin = req.session.isAdmin;

    try {
        // seleccionar comentario
        const result = await db.query('SELECT * FROM comments WHERE id = $1', [commentId]);
        const comentario = result.rows[0];

        // verificar existencia del comentario
        if (!comentario) {
            return res.status(404).send('Comentario no encontrado');
        }

        // verificar que sea el dueño o usuario adminstrador
        if (comentario.user_id !== userId && !isAdmin) {
            return res.status(403).send('No autorizado para eliminar este comentario');
        }

        // eliminar comentario
        await db.query('DELETE FROM comments WHERE id = $1', [commentId]);

        res.redirect(`/post/${comentario.post_id}/comments`);
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        res.status(500).send('Error al eliminar el comentario');
    }
}

export const likeComment = async (req, res) => {
    const commentId = req.params.id;
    const userId = req.session.userId;

    try {
        // seleccionar comentario
        const result = await db.query(`
            SELECT * FROM comment_likes WHERE comment_id = $1 AND user_id = $2
        `, [commentId, userId]);

        if (result.rows.length > 0) {
            // si ya había like, quitarlo
            await db.query(`
                DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2
            `, [commentId, userId]);
            return res.json({ liked: false });
        } else {
            // si no había like, agregarlo
            await db.query(`
                INSERT INTO comment_likes (comment_id, user_id, created_at)
                VALUES ($1, $2, NOW())
            `, [commentId, userId]);
            return res.json({ liked: true });
        }
    } catch (err) {
        console.error("Error en like de comentario:", err);
        res.status(500).json({ error: 'Error interno' });
    }
}