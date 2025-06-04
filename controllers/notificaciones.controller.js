import db from "../config/db.js";
import { formatRelativeDate } from "../utils/dateUtils.js";

export const renderNotificaciones = async (req, res) => {
    const userId = req.session.userId;

    try {
        // obtener los foros a los que pertenece el usuario
        const tusForosResult = await db.query(`
            SELECT foro_id 
            FROM foro_users 
            WHERE user_id = $1
        `, [userId]);
        const tusForoIds = tusForosResult.rows.map(row => row.foro_id);

        // obtener foros populares
        const forosPopularesResult = await db.query(`
            SELECT id 
            FROM foros 
            WHERE id NOT IN (
                SELECT foro_id 
                FROM foro_users 
                WHERE user_id = $1
            )
            ORDER BY id ASC
            LIMIT 7
        `, [userId]);
        const forosPopularesIds = forosPopularesResult.rows.map(row => row.id);

        // combinar ambos tipos de foros
        const foroIds = [...new Set([...tusForoIds, ...forosPopularesIds])];

        // en caso no haya notificaciones
        if (foroIds.length === 0) {
            return res.render('notificaciones', { notificaciones: [] });
        }

        // obtener publicaciones recientes en esos foros
        const postsResult = await db.query(`
            SELECT p.*, f.title AS foro_title, u.name AS user_name
            FROM posts p
            JOIN foros f ON p.foro_id = f.id
            JOIN users u ON p.user_id = u.id
            WHERE p.foro_id = ANY($1)
            ORDER BY p.created_at DESC
            LIMIT 20
        `, [foroIds]);

        // obtener notificaciones de likes
        const likesResult = await db.query(`
            SELECT pl.*, u.name AS user_name, p.content AS post_content, f.title AS foro_title, f.id AS foro_id
            FROM post_likes pl
            JOIN users u ON pl.user_id = u.id
            JOIN posts p ON pl.post_id = p.id
            JOIN foros f ON p.foro_id = f.id
            WHERE p.user_id = $1 AND pl.user_id != $1
            ORDER BY pl.created_at DESC
            LIMIT 10
        `, [userId]);        

        // obtener notificaciones de comentarios
        const commentsResult = await db.query(`
            SELECT c.*, u.name AS user_name, p.content AS post_content, f.title AS foro_title
            FROM comments c
            JOIN users u ON c.user_id = u.id
            JOIN posts p ON c.post_id = p.id
            JOIN foros f ON p.foro_id = f.id
            WHERE p.user_id = $1 AND c.user_id != $1
            ORDER BY c.created_at DESC
            LIMIT 10
        `, [userId]);

        // obtener notificaciones de likes en comentarios
        const likesComentariosResult = await db.query(`
            SELECT cl.*, u.name AS user_name, c.content AS comment_content, p.id AS post_id, f.id AS foro_id, f.title AS foro_title
            FROM comment_likes cl
            JOIN users u ON cl.user_id = u.id
            JOIN comments c ON cl.comment_id = c.id
            JOIN posts p ON c.post_id = p.id
            JOIN foros f ON p.foro_id = f.id
            WHERE c.user_id = $1 AND cl.user_id != $1
            ORDER BY cl.created_at DESC
            LIMIT 10
        `, [userId]);        

        const notificaciones = [];

        // formatear publicaciones
        postsResult.rows.forEach(post => {
            notificaciones.push({
                tipo: 'post',
                autor: post.user_name,
                foro: post.foro_title,
                foroId: post.foro_id,
                postId: post.id,
                contenido: post.content,
                fecha: post.created_at
            });
        });
        
        // formatear likes
        likesResult.rows.forEach(like => {
            notificaciones.push({
                tipo: 'like',
                autor: like.user_name,
                foro: like.foro_title,
                foroId: like.foro_id,
                postId: like.post_id,
                contenido: like.post_content,
                fecha: post.created_at
            });
        });
        
        // formatear comentarios
        commentsResult.rows.forEach(comment => {
            notificaciones.push({
                tipo: 'comentario',
                autor: comment.user_name,
                foro: comment.foro_title,
                foroId: comment.foro_id,
                postId: comment.post_id,
                contenido: comment.content,
                fecha: post.created_at
            });
        });

        // formatear likes en comentarios
        likesComentariosResult.rows.forEach(like => {
            notificaciones.push({
                tipo: 'like-comentario',
                autor: like.user_name,
                foro: like.foro_title,
                foroId: like.foro_id,
                postId: like.post_id,
                contenido: like.comment_content,
                fecha: like.created_at
            });
        });
        
        // ordenarlas por fecha descendente
        notificaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        // Formatear la fecha para mostrarla ya legible en la vista
        notificaciones.forEach(n => {
            n.fecha_formateada = formatRelativeDate(n.fecha);
        });

        res.render('notificaciones', { notificaciones });

    } catch (error) {
        console.error('Error cargando notificaciones:', error);
        res.status(500).send('Error al cargar notificaciones');
    }
}