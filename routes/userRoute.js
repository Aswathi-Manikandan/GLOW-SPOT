const express = require('express');
const userroute = express.Router();
const userController = require('../controllers/userController');
const cartController = require('../controllers/cartController')
const checkoutController = require('../controllers/checkoutController')
const passwordController = require('../controllers/passwordController')
const wishlistController = require('../controllers/wishlistController')
const walletController = require('../controllers/walletController');
const passport = require('passport');
require('../passport');
const { checkUserBlocked } = require('../middleware/auth')
const { isAuthenticated } = require('../middleware/auth');

const { updateProfileValidationRules, updateProfile } = require('../controllers/userController');



userroute.use(passport.initialize());
userroute.use(passport.session());


const auth = require('../middleware/auth');

userroute.get('/', auth.checkUserBlocked, userController.loadHome);


userroute.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));
userroute.get('/google/callback',
    passport.authenticate('google', {
        successRedirect: '/success', // Redirect to this URL after successful authentication
        failureRedirect: '/failure',   // Redirect to this URL if authentication fails
    })
);

//Success
userroute.get('/success', userController.successGoogleLogin);

//Failure
userroute.get('/failure', userController.failureGoogleLogin);

userroute.get('/register', auth.isLogout, userController.loadRegister);
userroute.post("/register", userController.insertUser);

userroute.get("/otp-verification", userController.loadOtp);
userroute.post("/verify-otp", userController.verifyOtp);
userroute.get("/resend-otp", userController.resendOtp);



userroute.get('/forgot-password', passwordController.loadForgotPasswordForm);

// Handle submission of forgot password form
userroute.post('/forgot-password', passwordController.sendForgotPasswordEmail);

// Load reset password form with OTP verification
userroute.get('/reset-password/:email', passwordController.loadResetPasswordForm);

// Handle submission of reset password form
userroute.post('/reset-password/:email', passwordController.resetPassword);



userroute.get('/login', auth.isLogout, userController.loginLoad);
userroute.post('/login', userController.verifyLogin);
userroute.get('/logout', auth.isLogin, userController.userLogout);


userroute.get('/category',userController.loadCategory)

//single product
userroute.get('/product/:productId',userController.loadProductDetails)





userroute.get('/cart', auth.isAuthenticated, cartController.loadCart);
userroute.post('/cart/add-to-cart/:productId', auth.isAuthenticated, cartController.addToCart);
userroute.delete('/cart/remove-from-cart/:productId', auth.isAuthenticated, cartController.removeFromCart);
userroute.get('/cart/count', auth.isAuthenticated, cartController.getCartCount);
userroute.post('/cart/update-quantity/:productId', auth.isAuthenticated, cartController.updateQuantity);



// Route for adding a product to the wishlist
userroute.post('/wishlist/add-to-wishlist/:productId', auth.isAuthenticated, wishlistController.addToWishlist);
// Route for removing a product from the wishlist
userroute.delete('/wishlist/remove-from-wishlist/:productId', auth.isAuthenticated, wishlistController.removeFromWishlist);
// Route for displaying the wishlist page
userroute.get('/wishlist', auth.isAuthenticated, wishlistController.showWishlistPage);

userroute.get('/wishlist/count', auth.isAuthenticated, wishlistController.getWishlistCount);

//------checkout------//
userroute.get('/checkout',checkoutController.loadCheckout)
userroute.post('/checkout', checkoutController.createCheckout);


userroute.get('/order',checkoutController.listOrders)
userroute.post('/order-details',checkoutController.getDetails)
userroute.post('/cancel-order',checkoutController.cancelOrder)
userroute.post('/return-order', checkoutController.returnOrder);
userroute.post('/create-razorpay-order', checkoutController.createRazorpayOrder);
userroute.get('/coupons', checkoutController.loadUserCouponsPage);
userroute.post('/apply-coupon',checkoutController.applyCoupon)
userroute.get('/download-invoice/:orderId', checkoutController.downloadInvoice);
userroute.post('/update-order-status', checkoutController.updateOrderStatus);
userroute.post('/create-pending-order', checkoutController.createPendingOrder);





userroute.get('/wallet', walletController.loadWallet);
userroute.post('/add-transaction', walletController.addTransaction);




userroute.get('/userProfile', userController.loadProfile);
userroute.get('/profileEdit', userController.loadEditProfile);
// userroute.post('/profile/update', userController.updateProfile);
userroute.post('/profile/update', updateProfileValidationRules(), updateProfile);


// Route for changing password
userroute.get('/change-password', userController.loadChangePasswordForm);
userroute.post('/change-password', userController.changePassword);


//<-------address-------->//
userroute.get('/address',userController.loadAddress)
userroute.get('/address/add',userController.loadaddAddress)
userroute.post('/address', userController.addAddress);
userroute.post('/address/delete/:id', userController.deleteAddress);
userroute.get('/address/edit/:id', userController.loadEditAddress);
userroute.post('/address/update/:id', userController.updateAddress);



userroute.get('/thankyou',userController.loadThankyou)


//-------------------wishlist---------------------------//


module.exports = userroute;
