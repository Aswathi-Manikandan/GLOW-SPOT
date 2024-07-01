const isLogin = async (req, res, next) => {
    try {
        if (!req.session.user_id) {
            return res.redirect('/admin'); // Redirect to login page if user is not logged in
        }
        next(); // Move to the next middleware or route handler
    } catch (error) {
        console.log(error.message);
        res.redirect('/admin'); // Redirect to login page if an error occurs
    }
};

const isLogout = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            return res.redirect('/admin/home'); 
        }
        next(); // Move to the next middleware or route handler
    } catch (error) {
        console.log(error.message);
        res.redirect('/admin'); // Redirect to login page if an error occurs
    }
};

module.exports = {
    isLogin,
    isLogout
};
