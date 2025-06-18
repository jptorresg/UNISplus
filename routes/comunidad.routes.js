import express from "express";
import { renderComunidad } from "../controllers/comunidad/comunidad.controller.js";
import {
    renderComments,
    addComment,
    renderEditComment,
    editComment,
    deleteComment,
    likeComment
} from "../controllers/comunidad/comments.controller.js";
import {
    renderNewPost,
    newPost,
    renderEditPost,
    editPost,
    deletePost,
    likePost
} from "../controllers/comunidad/posts.controller.js";
import {
    renderNewForo,
    newForo,
    renderEditForo,
    editForo,
    deleteForo,
    renderForos,
    joinForo,
    leaveForo
} from "../controllers/comunidad/foros.controller.js";
import { requireLogin, requireAdmin } from "../middleware/auth.js";
import upload from "../middleware/multerConfig.js";

const router = express.Router();

router.get('/comunidad', requireLogin, renderComunidad);

router.get('/post/:id/comments', requireLogin, renderComments);
router.post('/comentar/:postId', requireLogin, addComment);
router.get('/editComment/:commentId', requireLogin, renderEditComment);
router.post('/editComment/:commentId', requireLogin, editComment);
router.get('/deleteComment/:commentId', requireLogin, deleteComment);
router.post('/comment/:id/like', requireLogin, likeComment);

router.get('/newPost/:foroId', requireLogin, renderNewPost);
router.post('/newPost/:foroId', upload.single('image'), requireLogin, newPost);
router.get('/editPost/:id', requireLogin, renderEditPost);
router.post('/editPost/:id', upload.single('image'), requireLogin, editPost);
router.get('/deletePost/:id', requireLogin, deletePost);
router.post('/post/:id/like', requireLogin, likePost);

router.get('/newForo', requireLogin, requireAdmin, renderNewForo);
router.post('/newForo', upload.single('image'), requireLogin, requireAdmin, newForo);
router.get('/foros/edit/:id', requireLogin, requireAdmin, renderEditForo);
router.post('/foros/edit/:id', upload.single('image'), requireLogin, requireAdmin, editForo);
router.post('/foros/delete/:id', requireLogin, requireAdmin, deleteForo);
router.get('/foros', requireLogin, renderForos);
router.post('/foros/join/:id', requireLogin, joinForo);
router.post('/foros/leave/:id', requireLogin, leaveForo);

export default router;