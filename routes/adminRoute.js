// routes/adminRouter.js
const express = require('express');
const adminRoute = express();
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const adminController = require('../controllers/adminController');
const categoryController = require('../controllers/categoryController');
const productController = require('../controllers/productController');
const adminOrderController = require('../controllers/adminOrderController');
const offerController = require('../controllers/offerController');
const couponController = require('../controllers/couponController');
const salesController = require('../controllers/salesController');

const auth = require('../middleware/adminAuth');

// Set view engine and views directory
adminRoute.set('view engine', 'ejs');
adminRoute.set('views', './views/admin');

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/product_images'));
  },
  filename: function (req, file, cb) {
    const name = Date.now() + '-' + file.originalname;
    cb(null, name);
  },
});
const upload = multer({ storage: storage });

// Routes
adminRoute.get('/', auth.isLogout, adminController.loadLogin);
adminRoute.post('/', adminController.verifyLogin);
adminRoute.get('/home', auth.isLogin, adminController.loadDashboard);
adminRoute.get('/logout', auth.isLogin, adminController.logout);
adminRoute.get('/home', auth.isLogin, adminController.userSearch);

adminRoute.get('/usermanagement', auth.isLogin, adminController.adminDashboard);
adminRoute.get('/users', auth.isLogin, adminController.getUsers);
adminRoute.post('/users/:userId/block', auth.isLogin, adminController.blockUser);
adminRoute.post('/users/:userId/unblock', auth.isLogin, adminController.unblockUser);
adminRoute.post('/users/:userId/toggle-block', auth.isLogin, adminController.toggleUserBlock);

adminRoute.get('/category', auth.isLogin, categoryController.loadCategory);
adminRoute.get('/category/add', auth.isLogin, categoryController.loadAddCategory);
adminRoute.post('/category/add', auth.isLogin, categoryController.addCategory);
adminRoute.get('/category/edit/:id', auth.isLogin, categoryController.LoadEditCategory);
adminRoute.post('/category/edit/:id', auth.isLogin, categoryController.editCategory);
adminRoute.get('/category/search', auth.isLogin, categoryController.searchCategory);
adminRoute.post('/category/block/:id', auth.isLogin, categoryController.blockCategory);
adminRoute.post('/category/unblock/:id', auth.isLogin, categoryController.unblockCategory);
adminRoute.post('/category/update-offer/:id', auth.isLogin, categoryController.updateCategoryOffer);

adminRoute.get('/products', auth.isLogin, productController.loadProducts);
adminRoute.get('/products/add', auth.isLogin, productController.loadAddProducts);
adminRoute.post('/products/addpost', auth.isLogin, upload.array('images', 4), productController.addProduct);
adminRoute.get('/products/edit/:id', auth.isLogin, productController.loadEditProduct);
adminRoute.post('/products/edit/:id', auth.isLogin, upload.array('images', 4), productController.editProduct);
adminRoute.get('/products/toggle/:id', auth.isLogin, productController.toggleProductStatus);
adminRoute.post('/products/update-offer/:id', auth.isLogin, productController.updateProductOffer);

adminRoute.post('/products/edit/:id/delete-image', auth.isLogin, productController.deleteImage);

adminRoute.get('/orders', auth.isLogin, adminOrderController.listOrdersAdmin);
adminRoute.post('/orders/update-order-status', auth.isLogin, adminOrderController.updateOrderStatus);

// Offer routes
adminRoute.get('/offers', auth.isLogin, offerController.loadOffersPage);
adminRoute.get('/offers/add', auth.isLogin, offerController.loadAddOfferPage);
adminRoute.post('/offers/add', auth.isLogin, offerController.addOffer);
adminRoute.get('/offers/edit/:id', auth.isLogin, offerController.loadEditOfferPage);
adminRoute.post('/offers/edit/:id', auth.isLogin, offerController.editOffer);
adminRoute.delete('/offers/delete/:id', auth.isLogin, offerController.deleteOffer);

// Coupon routes
adminRoute.get('/coupons', auth.isLogin, couponController.loadCouponsPage);
adminRoute.get('/coupons/add', auth.isLogin, couponController.loadAddCouponPage);
adminRoute.post('/coupons/add', auth.isLogin, couponController.addCoupon);
adminRoute.get('/coupons/edit/:id', auth.isLogin, couponController.loadEditCouponPage);
adminRoute.post('/coupons/edit/:id', auth.isLogin, couponController.editCoupon);
adminRoute.delete('/coupons/delete/:id', auth.isLogin, couponController.deleteCoupon);

// Sales routes
adminRoute.get('/sales', auth.isLogin, salesController.loadSalesReport);
adminRoute.get('/sales/pdf', auth.isLogin, salesController.generatePDFReport);
adminRoute.get('/sales/excel', auth.isLogin, salesController.generateExcelReport);

// Redirect all other routes to /admin
adminRoute.get('*', (req, res) => {
  res.redirect('/admin');
});

module.exports = adminRoute;
