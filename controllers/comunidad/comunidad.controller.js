import db from "../../config/db.js";
import { formatRelativeDate } from "../../utils/dateUtils.js";

export const renderComunidad = async (req, res) => {
    const userId = req.session.userId;
    const isAdmin = req.session.isAdmin;
    const foroSeleccionadoId = req.query.foro || null;

    try {
        // obtener todos los foros del usuario
        const tusForosResult = await db.query(`
            SELECT f.id, f.title, f.image, f.description
            FROM foros f
            JOIN foro_users fu ON f.id = fu.foro_id
            WHERE fu.user_id = $1
        `, [userId]);
        const tusForos = tusForosResult.rows;

        // obtener foros populares
        const forosPopularesResult = await db.query(`
            SELECT id, title, image, description
            FROM foros
            WHERE id NOT IN (
                SELECT foro_id
                FROM foro_users
                WHERE user_id = $1
            )
            ORDER BY id ASC
            LIMIT 7
        `, [userId]);
        const forosPopulares = forosPopularesResult.rows;

        // determinar foro actual
        const todosLosForos = [...tusForos, ...forosPopulares];

        // eliminar duplicados por ID
        const forosUnicos = Array.from(new Map(todosLosForos.map(f => [f.id, f])).values());
        let foroActual = null;
        if (foroSeleccionadoId) {
            foroActual = forosUnicos.find(f => f.id == foroSeleccionadoId);
        }
        if (!foroActual && tusForos.length > 0) {
            foroActual = todosLosForos[0];
        }

        // obtener posts del foro actual
        let posts = [];
        if (foroActual) {
            const postsResult = await db.query(`
                SELECT 
                    p.*, 
                    u.name AS user_name, 
                    u.profile_pic,
                    EXISTS (
                        SELECT 1 
                        FROM post_likes pl 
                        WHERE pl.post_id = p.id AND pl.user_id = $2
                    ) AS liked,
                    (
                        SELECT COUNT(*) 
                        FROM post_likes 
                        WHERE post_id = p.id
                    ) AS like_count,
                     (
                        SELECT COUNT(*) 
                        FROM comments 
                        WHERE post_id = p.id
                    ) AS comment_count
                FROM posts p
                JOIN users u ON p.user_id = u.id
                WHERE p.foro_id = $1
                ORDER BY p.created_at DESC
            `, [foroActual.id, userId]);

            posts = postsResult.rows.map(post => ({
                ...post,
                user_name: post.user_name,
                date: formatRelativeDate(post.created_at),
                profilePic: post.profile_pic 
                    ? `/uploads/${post.profile_pic}`
                    : "/images/default_profile_image.jpg",
                likes: parseInt(post.like_count) || 0,
                comments: parseInt(post.comment_count) || 0,
                liked: post.liked
            }));            
        }

        // renderizar la página de comunidad
        res.render('comunidad', {
            linkLeft: '',
            iconLeft: 'fa-solid fa-list',
            leftFunction: 'openMenu()',
            linkRight: '/perfil',
            iconRight: 'fa-solid fa-user',
            rightFunction: '',
        
            tusForos,
            forosPopulares,
            foroActual,
            posts,
            isAdmin,
            foroActualId: foroActual ? foroActual.id : null,
            userId: req.session.userId
        });        
    } catch (err) {
        console.error("Error cargando comunidad:", err);
        res.status(500).send("Error al cargar la comunidad");
    }
}