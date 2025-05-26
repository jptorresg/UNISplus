// paquetes usados
import express from 'express';
import path from 'path';
import pg from "pg";
import { hashPassword, verifyPassword } from "cryptography-password-js";
import session from 'express-session';
import multer from 'multer';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// declaración de puerto
const app = express();
const PORT = process.env.PORT;

// declaración de cookie
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie:{ secure: false } 
}));

// conexión a la base de datos
const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

await db.connect();

// configuración de nodemailer
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// función para enviar el correo
async function enviarCodigoVerificacion(email, nombre, codigo) {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Código de verificación UNIS+',
        html: `
            <p>Buenos días, tardes o noches <strong>${nombre}</strong>,</p>
            <p>Para poder registrarte en UNIS+, favor ingresar el siguiente código:</p>
            <h2>${codigo}</h2>
            <p>Este código es de uso personal, no lo compartas con nadie. Si no hiciste esta solicitud, simplemente ignora este correo.</p>
            <p>Cualquier problema, por favor comunicarse con <a href="mailto:soporte.unisplus@gmail.com">soporte.unisplus@gmail.com</a>, solucionaremos tu problema lo más rápido posible.</p>
            <p>Ten un excelente día.</p>
            <br>
            <p>Atentamente, UNIS+</p>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Correo enviado:', info.response);
        return true;
    } catch (error) {
        console.error('Error al enviar el correo:', error);
        return false;
    }
}

// declaración de multer
const __dirname = path.resolve();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// función para formatear la fecha
function formatRelativeDate(date) {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `Hace ${diffMins} minutos`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `Hace ${diffHrs} horas`;
    const diffDays = Math.floor(diffHrs / 24);
    return `Hace ${diffDays} días`;
}

// middlewares
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// middleware para autenticación de login
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect("/login");
    }
    next();
}

// middleware para autenticación de admin
function requireAdmin(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(403).send('Acceso denegado');
    }
}

// renderizar el formulario de login
app.get('/login', (req, res) => {
    res.render('login.ejs', {error: null});
});

// ruta de login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // buscar el usuario en la base de datos
    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        
        // verificar si el usuario existe
        if(result.rows.length > 0) {
            const user = result.rows[0];

            // verificar si el usuario esta verificado
            if (!result.rows[0].is_verified) {
                return res.render('login.ejs', { error: 'Debes verificar tu cuenta antes de iniciar sesión' });
            }

            // verificar la contraseña
            const isValid = await verifyPassword(password, user.password_hash);

            // si la contraseña es correcta, iniciar sesión
            if (isValid) {
                req.session.userId = user.id;
                req.session.username = user.username;
                req.session.isAdmin = user.is_admin;
                return res.redirect('/');
            }
        }

        res.render('login.ejs', {error: "Usuario o contraseña incorrectos"});
    } catch (error) {
        console.error("Error en el login", error);
        res.status(500).render('login.ejs', {error: "Error en el servidor"});
    }
});

// renderizar el formulario de registro
app.get('/register', (req, res) => {
    res.render('register.ejs', {error: null});
});

// rutas de registro
app.post('/register', async (req, res) => {
    const { username, password, confirmPassword, name } = req.body;

    // validaciones de usuario, contraseña y nombre
    if (!username.endsWith('@unis.edu.gt')) {
        return res.render('register.ejs', { error: "Solamente se pueden registrar usuarios con el correo de la universidad", username, name });
    }
    if (username.length > 128) {
        return res.render('register.ejs', { error: "El nombre de usuario no puede tener más de 128 caracteres", username, name });
    }
    if (password.length < 8) {
        return res.render('register.ejs', { error: "La contraseña debe tener al menos 8 caracteres", username, name });
    }
    if (!/[!@#$%&*?/\\]/.test(password)) {
        return res.render('register.ejs', { error: "La contraseña debe incluir al menos uno de estos caracteres:<br>! @ # $ % & * ? / \\ ", username, name });
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return res.render('register.ejs', { error: "La contraseña debe incluir al menos una letra mayúscula, minúscula y un número", username, name });
    }
    if (password !== confirmPassword) {
        return res.render('register.ejs', { error: "Las contraseñas no coinciden", username, name });
    }
    if (name.length > 128) {
        return res.render('register.ejs', { error: "El nombre no puede tener más de 128 caracteres", username, name });
    }

    try {
        // verificar si el nombre de usuario ya existe
        const userExists = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userExists.rows.length > 0) {
            return res.render('register.ejs', { error: "El nombre de usuario ya está en uso", username, name });
        }       

        // sazonar la contraseña
        const hashedPassword = await hashPassword(password, {
            keyLen: 64,
            N: 16384,
            r: 8,
            p: 1,
            maxmem: 64 * 1024 * 1024
        }); 

        // generar código de verificación
        const generateCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let code = '';
            for (let i = 0; i < 8; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        };
        
        const code = generateCode();
        const rawCode = code;
        const hashedCode = await hashPassword(code);        
        
        // guardar el usuario en la base de datos
        await db.query(`
            INSERT INTO users (username, password_hash, name, is_verified, verification_code_hash)
            VALUES ($1, $2, $3, FALSE, $4)
        `, [username, hashedPassword, name, hashedCode]);

        // enviar correo de verificación
        const exito = await enviarCodigoVerificacion(username, name, rawCode);
        if (!exito) {
            return res.status(500).json({ error: 'Error al enviar el correo de verificación.' });
        }

        req.session.username = username;
        res.redirect('/verify');
    } catch (error) {
        console.error("Error al registrar usuario:", error);
        res.status(500).send('Error interno del servidor');
    }
});

// renderizar página de verificación
app.get('/verify', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/register');
    }

    res.render('verify.ejs', { error: null });
});

// ruta de verificación
app.post('/verify', async (req, res) => {
    const username = req.session.username;
    const { code } = req.body;

    if (!username) {
        return res.redirect('/register');
    }
    
    // obtener el código de verificación del usuario de la base de datos
    const result = await db.query('SELECT verification_code_hash FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
        return res.render('verify.ejs', { error: 'Usuario no encontrado' });
    }

    // verificar el código
    const hashedCodeFromDB = result.rows[0].verification_code_hash;

    const isValid = await verifyPassword(code, hashedCodeFromDB);

    if (!isValid) {
        return res.render('verify.ejs', { error: 'Código inválido' });
    }

    // marcar como verificado
    await db.query('UPDATE users SET is_verified = TRUE, verification_code_hash = NULL WHERE username = $1', [username]);

    req.session.destroy();
    res.redirect('/login');
});

// ruta de logout
app.post('/logout', (req, res) => {
    try {
        req.session.destroy(() => {
            res.redirect('/login');
        });
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        res.status(500).send("Error interno del servidor");
    }
});

// middleware para pasar el nombre de usuario a todas las vistas
app.use((req, res, next) => {
    res.locals.usuario = req.session.username || null;
    next();
});

// rutas de inicio
app.get(['/', '/inicio'], requireLogin, async (req, res) => {
    try {
        // obtener las novedades
        const novedadesResult = await db.query('SELECT * FROM novedades');
        let novedades = novedadesResult.rows;
        
        // ordenar las novedades por fecha de creación y mostrar solamente 5
        novedades.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

        novedades = novedades.slice(0, 5);

        // obtener los favoritos del usuario
        const result = await db.query("SELECT * FROM favoritos WHERE user_id = $1", [req.session.userId]);
        const favoritos = result.rows;

        // default de favoritos
        const placeholdersNecesarios = 5 - favoritos.length;
        for (let i = 0; i < placeholdersNecesarios; i++) {
            favoritos.push({
                imagen: "/images/favorito.png",
                descripcion: "¡Agrega foros favoritos!"
            });
        }

        // renderizar la página de inicio
        res.render('inicio', {
            linkLeft: '/games',
            iconLeft: 'fa-solid fa-gamepad',
            leftFunction: '',
            leftExtraClass: '',
            linkRight: '',
            iconRight: 'fa-solid fa-magnifying-glass',
            rightFunction: '',
            rightExtraClass: '',

            novedades,
            favoritos
        });
    } catch (error) {
        console.error("Error cargando la página de inicio:", err);
        res.status(500).send("Error al cargar la página de inicio");
    }
});

// renderizar la página de juegos
app.get('/games', requireLogin, (req, res) => {
    res.render('games', {
        linkLeft: '/inicio',
        iconLeft: 'fa-solid fa-chevron-left',
        linkRight: '',
        iconRight: '',
    });
});

// renderizar la página de información
app.get('/informacion', requireLogin, async (req, res) => {
    // obtener las novedades
    const novedadesResult = await db.query('SELECT * FROM novedades');
        let novedades = novedadesResult.rows;
        
        novedades.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

        novedades = novedades.slice(0, 5);
    
    res.render('informacion', {
        linkLeft: '',
        iconLeft: '',
        linkRight: '',
        iconRight: 'fa-solid fa-magnifying-glass',

        novedades
    });
});

// renderizar la página de comunidad
app.get('/comunidad', requireLogin, async (req, res) => {
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
});

//renderizar página de comentarios
app.get('/post/:id/comments', requireLogin, async (req, res) => {
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
});

// agregar un comentario
app.post('/comentar/:postId', requireLogin, async (req, res) => {
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
});

// renderizar la página de edición de un comentario
app.get('/editComment/:commentId', requireLogin, async (req, res) => {
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
});

// editar un comentario
app.post('/editComment/:commentId', requireLogin, async (req, res) => {
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
});

// eliminar comentario
app.get('/deleteComment/:commentId', requireLogin, async (req, res) => {
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
});

// dar/retirar like a un comentario
app.post('/comment/:id/like', requireLogin, async (req, res) => {
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
});

// renderizar la página de nuevo post
app.get('/newPost/:foroId', requireLogin, (req, res) => {
    const foroId = req.params.foroId;
    res.render('newPost', {
        foroId,
        linkLeft: '',
        iconLeft: '',
        linkRight: '',
        iconRight: ''
    });
});

// crear un nuevo post
app.post('/newPost/:foroId', requireLogin, upload.single('image'), async (req, res) => {
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
});

// renderizar la página de edición de post
app.get('/editPost/:id', requireLogin, async (req, res) => {
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
});

// editar un post
app.post('/editPost/:id', requireLogin, upload.single('image'), async (req, res) => {
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
});

// eliminar un post
app.get('/deletePost/:postId', requireLogin, async (req, res) => {
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
});

// dar/retirar like
app.post('/posts/:postId/like', requireLogin, async (req, res) => {
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
});

// renderizar la página de nuevo foro
app.get('/newForo', requireLogin, requireAdmin, (req, res) => {
    res.render('newForo', {
        linkLeft: '/comunidad' ,
        iconLeft: 'fa-solid fa-chevron-left',
        leftFunction: '',
        linkRight: '',
        iconRight: 'fa-solid fa-check',
        rightFunction: ''
    });
});

// crear un nuevo foro
app.post('/newForo', requireLogin, requireAdmin, upload.single('image'), async (req, res) => {
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
});

// renderizar la página de editar un foro
app.get('/foros/edit/:id', requireLogin, requireAdmin, async (req, res) => {
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
});

// actualizar un foro
app.post('/foros/edit/:id', requireLogin, requireAdmin, upload.single('image'), async (req, res) => {
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
});

// eliminar un foro
app.post('/foros/delete/:id', requireLogin, requireAdmin, async (req, res) => {
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
});

// renderizar la página de foros
app.get('/foros', requireLogin, async (req, res) => {
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
});

// unirse a un foro
app.post('/foros/join/:id', requireLogin, async (req, res) => {
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
});

// salir de un foro
app.post('/foros/leave/:id', requireLogin, async (req, res) => {
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
});

// renderizar la página de notificaciones
app.get('/notificaciones', requireLogin, async (req, res) => {
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
});

// renderizar la página de perfil
app.get('/perfil', requireLogin, async (req, res) => {
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
});

// renderizar la página de edición de perfil
app.get('/editPerfil', requireLogin, async (req, res) => {
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
});

// editar el perfil
app.post('/perfil/editar', requireLogin, upload.fields([
    { name: 'profile_pic', maxCount: 1 },
    { name: 'background_pic', maxCount: 1 }
]), async (req, res) => {
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
});

// renderizar página para cambiar contraseña
app.get('/perfil/changePassword', requireLogin, (req, res) => {
    res.render('changePassword');
});

// cambiar contraseña
app.post('/perfil/changePassword', requireLogin, async (req, res) => {
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
        const newHashed = await hashPassword(newPassword, {
            keyLen: 64,
            N: 16384,
            r: 8,
            p: 1,
            maxmem: 64 * 1024 * 1024
        });

        // Actualizar en la base de datos
        await db.query('UPDATE users SET password_hash = $1 WHERE username = $2', [newHashed, username]);

        res.redirect('/perfil');
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).send("Error interno del servidor");
    }
});

// iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});