export const attachUsernameToViews = (req, res, next) => {
  res.locals.usuario = req.session.username || null;
  next();
};