const User=require('../models/userModels')
const Cart = require('../models/cartModel')
const Address = require('../models/addressModel')

const checkUserBlocked = async (req, res, next) => {
    try {
        if (req.session && req.session.user_id) {
            const userData = await User.findById(req.session.user_id);

            if (userData && userData.blocked) {
                // If user is blocked, destroy session and redirect to homepage
                req.session.destroy();
                return res.redirect('/');
            }
        }
        // User is not blocked or not logged in, proceed to the next middleware
        next();
    } catch (error) {
        console.log(error.message+'middleware');
        res.status(500).send('Internal Server Error');
    }
};

const isLogin = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            next();
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.log(error.message);
    }
};

const isLogout = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            res.redirect('/');
        } else {
            next();
        }
    } catch (error) {
        console.log(error.message);
    }
};

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user_id) {
        return next();
    }
    if (req.method === 'POST' && req.params.productId) {
        req.session.tempProduct = req.params.productId;
    }
    res.redirect('/login');
};

const authenticateUser = async (req, res, next) => {
    try {
        let userData = null;

        // Check if the user is logged in with Google
        if (req.session.passport && req.session.passport.user) {
            // If logged in with Google, fetch user data based on Google ID
            userData = await User.findOne({ googleId: req.session.passport.user });
        } else {
            // If not logged in with Google, check for regular session user ID
            userData = await User.findOne({ _id: req.session.user_id });
        }

        // Pass the user data to all views
        res.locals.user = userData;

        next();
    } catch (error) {
        console.error('Error authenticating user:', error);
        next(error);
    }
};

// auth.js

exports.ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login'); // Redirect to login if not authenticated
};

exports.ensureGuest = (req, res, next) => {
    if (req.isAuthenticated()) {
        res.redirect('/'); // Redirect to home if already authenticated
    } else {
        return next();
    }
};


module.exports = {
    checkUserBlocked,
    isLogin,
    isLogout,
    isAuthenticated,
    authenticateUser
};
