import db from "../config/db.js";

export const renderInicio = async (req, res) => {
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
}

export const renderGames = async (req, res) => {
    res.render('games', {
        linkLeft: '/inicio',
        iconLeft: 'fa-solid fa-chevron-left',
        linkRight: '',
        iconRight: '',
    });
}