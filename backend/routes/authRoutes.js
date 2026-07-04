const express = require('express');
const router = express.Router();
const passport = require('passport');
const {
  signUp, signIn, refreshToken, logout,
  getMe, changePassword, googleCallback
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { signUpValidator, signInValidator, changePasswordValidator } = require('../validators/authValidator');

// Public routes
router.post('/signup', signUpValidator, validate, signUp);
router.post('/signin', signInValidator, validate, signIn);
router.post('/refresh', refreshToken);

// Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/signin?error=auth_failed` }),
  googleCallback
);

// Protected routes
router.use(authenticate);
router.post('/logout', logout);
router.get('/me', getMe);
router.put('/change-password', changePasswordValidator, validate, changePassword);

module.exports = router;