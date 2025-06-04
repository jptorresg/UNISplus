import db from "../config/db.js";

export const renderInformacion = async (req, res) => {
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
}