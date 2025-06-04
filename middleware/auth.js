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

export { requireLogin, requireAdmin };