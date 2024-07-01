const User = require('../models/userModels');
const Checkout = require('../models/checkoutModel'); 
 
const Product = require('../models/productModel'); 
const Category = require('../models/categoryModel'); 
const bcrypt = require('bcrypt'); 
// const randomstring = require('randomstring');
const config = require('../config/config');
const randomstring = require('randomstring')

const securePassword = async(password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10); 
        return passwordHash;
    } catch (error) {
        console.log(error.message);
    }
}

const loadLogin = async (req, res) => {
    try {
        const logoutMessage = req.query.logout === 'success' ? 'Logout successfully' : ''; // Check if the logout query parameter is present
        res.render('login', { logoutMessage });
    } catch (error) {
        console.log(error.message);
        res.render('/admin/login'); // Render login page without any message if an error occurs
    }
};

const verifyLogin = async(req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        const userData = await User.findOne({ email: email });

        if (userData) {
            const passwordMatch = await bcrypt.compare(password, userData.password);

            if (passwordMatch) {
                if (userData.is_admin === 0) {
                    res.render('login', { message: 'Email and password are incorrect' });
                } else {
                    req.session.user_id = userData._id;
                    res.redirect('/admin/home');
                }
            } else {
                res.render('login', { message: 'Email and password are incorrect' });
            }
        } else {
            res.render('login', { message: 'Email and password are incorrect' });
        }
    } catch (error) {
        console.log(error.message);
    }
}

const getBestSellingProducts = async () => {
    return await Checkout.aggregate([
        { $unwind: '$products' },
        { $group: { 
            _id: '$products.product', 
            totalQuantity: { $sum: '$products.quantity' } 
        }},
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
        { $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productDetails'
        }},
        { $unwind: '$productDetails' },
        { $project: {
            _id: 1,
            totalQuantity: 1,
            'productDetails.name': 1,
            'productDetails.price': 1
        }}
    ]);
}

const getBestSellingCategories = async () => {
    return await Checkout.aggregate([
        { $unwind: '$products' },
        { $lookup: {
            from: 'products',
            localField: 'products.product',
            foreignField: '_id',
            as: 'productDetails'
        }},
        { $unwind: '$productDetails' },
        { $group: { 
            _id: '$productDetails.category', 
            totalQuantity: { $sum: '$products.quantity' } 
        }},
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
        { $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'categoryDetails'
        }},
        { $unwind: '$categoryDetails' },
        { $project: {
            _id: 1,
            totalQuantity: 1,
            'categoryDetails.name': 1
        }}
    ]);
}

const loadDashboard = async (req, res) => {
    try {
        const filter = req.query.filter || 'yearly';
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;

        let orders = [];
        let categorySales = [];

        if (filter === 'yearly') {
            orders = await Checkout.aggregate([
                { $match: { status: 'delivered', createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } } },
                { $group: { _id: { $month: "$createdAt" }, totalOrders: { $sum: 1 }, totalSales: { $sum: { $sum: "$products.price" } }, totalItemsSold: { $sum: { $sum: "$products.quantity" } } } },
                { $sort: { _id: 1 } }
            ]);

            categorySales = await Checkout.aggregate([
                { $match: { status: 'delivered', createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } } },
                { $unwind: "$products" },
                { $lookup: { from: "categories", localField: "products.category", foreignField: "_id", as: "categoryDetails" } },
                { $unwind: "$categoryDetails" },
                { $group: { _id: "$categoryDetails.name", totalSales: { $sum: "$products.price" } } },
                { $sort: { totalSales: -1 } }
            ]);

        } else if (filter === 'monthly') {
            orders = await Checkout.aggregate([
                { $match: { status: 'delivered', createdAt: { $gte: new Date(`${year}-${month}-01`), $lte: new Date(`${year}-${month}-31`) } } },
                { $group: { _id: { $dayOfMonth: "$createdAt" }, totalOrders: { $sum: 1 }, totalSales: { $sum: { $sum: "$products.price" } }, totalItemsSold: { $sum: { $sum: "$products.quantity" } } } },
                { $sort: { _id: 1 } }
            ]);

            categorySales = await Checkout.aggregate([
                { $match: { status: 'delivered', createdAt: { $gte: new Date(`${year}-${month}-01`), $lte: new Date(`${year}-${month}-31`) } } },
                { $unwind: "$products" },
                { $lookup: { from: "categories", localField: "products.category", foreignField: "_id", as: "categoryDetails" } },
                { $unwind: "$categoryDetails" },
                { $group: { _id: "$categoryDetails.name", totalSales: { $sum: "$products.price" } } },
                { $sort: { totalSales: -1 } }
            ]);
        }

        const bestSellingProducts = await getBestSellingProducts();
        const bestSellingCategories = await getBestSellingCategories();

        const categorySalesFormatted = categorySales.map(sale => ({
            category: sale._id,
            totalSales: sale.totalSales
        }));

        // Get total sales count and total orders
        const totalSalesCount = await Checkout.aggregate([
            { $match: { status: 'delivered' } },
            { $group: { _id: null, totalSales: { $sum: { $sum: "$products.price" } }, totalOrders: { $sum: 1 }, totalItemsSold: { $sum: { $sum: "$products.quantity" } } } }
        ]);

        // Get total users
        const totalUsers = await User.countDocuments();

        // Get total coupons used
        const totalCouponsUsed = await Checkout.aggregate([
            { $match: { couponUsed: { $exists: true, $ne: null } } },
            { $count: "totalCouponsUsed" }
        ]);

        res.render('home', {
            filter,
            year,
            month,
            orders,
            bestSellingProducts,
            bestSellingCategories,
            categorySales: categorySalesFormatted,
            totalSalesCount: totalSalesCount.length > 0 ? totalSalesCount[0].totalItemsSold : 0,
            totalOrders: totalSalesCount.length > 0 ? totalSalesCount[0].totalOrders : 0,
            totalUsers,
            totalCouponsUsed: totalCouponsUsed.length > 0 ? totalCouponsUsed[0].totalCouponsUsed : 0
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};


const logout = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect('/admin/login?logout=success');
    } catch (error) {
        console.log(error.message);
        res.redirect('/admin/login'); // Redirect to login page without any message if an error occurs
    }
};


const userSearch = async(req,res)=>{
    try {

        var search = '';
        if(req.query.search){
            search = req.query.search;
        }
        const userData = await User.find({
            is_admin:0,
            $or:[
                {name:{ $regex:'.*'+search+'.*',$options:'i'}},
                {email:{$regex:'.*'+search+'.*',$options:'i'}},
                {mobile:{$regex:'.*'+search+'.*',$options:'i'}}
          ] 
        })
        
        res.render('home',{user:userData})

    } catch (error) {
        console.log(error.message);
    }
}


const adminDashboard = async (req, res) => {
    try {
        let search = req.query.search || ''; // Default to an empty string if search query parameter is not provided
        let currentPage = parseInt(req.query.page) || 1; // Default to page 1 if page query parameter is not provided
        const pageSize = 6; // Number of items per page

        // Calculate skip value for pagination
        const skip = (currentPage - 1) * pageSize;

        // Fetch users data with pagination and search query
        const usersData = await User.find({
            is_admin: 0,
            $or: [
                { name: { $regex: '.*' + search + '.*', $options: "i" } },
                { email: { $regex: '.*' + search + '.*', $options: "i" } },
                { mobile: { $regex: '.*' + search + '.*', $options: "i" } }
            ]
        }).skip(skip).limit(pageSize);

        // Get total count of users matching the search criteria
        const totalUsers = await User.countDocuments({
            is_admin: 0,
            $or: [
                { name: { $regex: '.*' + search + '.*', $options: "i" } },
                { email: { $regex: '.*' + search + '.*', $options: "i" } },
                { mobile: { $regex: '.*' + search + '.*', $options: "i" } }
            ]
        });

        // Calculate total pages for pagination
        const totalPages = Math.ceil(totalUsers / pageSize);

        res.render('usermanagement', { users: usersData, currentPage, search, totalPages });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
}


const createUser = async (req, res) => {
    try {
        const check = await User.findOne({ email: req.body.email })
        if (check) {
            const err = "email already taken"
            res.render('create-user', { err });
        } else {

            const spassword = await securePassword(req.body.password);
            const user = new User({
                name: req.body.name,
                email: req.body.email,
                mobile: req.body.mno,

                password: spassword,
                // password:req.body.password,
                is_admin: 0,
            });
            const userData = await user.save();

            if (userData) {

                res.redirect('/admin/usermanagement')
            } else {

                res.redirect('/create_user')
            }
        }

    } catch (error) {
        console.log(error.message);

    }
};

const creatuserpannel = (req, res) => {
    res.render('create_user');
}

//--------------------blocking and unblocking user--------------------------//

//---------------get request ---------------------------//

const getUsers = async (req, res) => {
    const users = await User.find();
    res.render('users', { users });
  };
//----------------ending of get--------------//

//----------------post----------------------//
  const blockUser = async (req, res) => {
    const userId = req.params.userId;
    await User.findByIdAndUpdate(userId, { blocked: true });
    res.send('User blocked successfully');
  };
  
  const unblockUser = async (req, res) => {
    const userId = req.params.userId;
    await User.findByIdAndUpdate(userId, { blocked: false });
    res.send('User unblocked successfully');
  };
//----------------------ending of post-----------//


const toggleUserBlock = async (req, res) => {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).send('User not found');
    }

    // Toggle the blocked status
    user.blocked = !user.blocked;
    await user.save();

    res.send('User status updated successfully');
};


// Controller to list all ordered products
const listOrderedProducts = async (req, res) => {
    try {
        // Fetch all checkouts and populate products with 'products' model
        const checkouts = await Checkout.find().populate('products.product');

        // Prepare an array to store all ordered products
        const orderedProducts = [];

        // Loop through each checkout to extract ordered products
        checkouts.forEach(checkout => {
            checkout.products.forEach(productInfo => {
                const { product, price, quantity } = productInfo;

                // Ensure product is available
                if (product) {
                    orderedProducts.push({
                        orderId: checkout._id,
                        productName: product.name,
                        price,
                        quantity,
                        status: checkout.status
                    });
                }
            });
        });

        // Render the view with ordered products data
        res.render('orders', { orderedProducts });

    } catch (error) {
        console.error('Error listing ordered products:', error);
        res.status(500).send('Internal Server Error');
    }
};


module.exports = {
    loadLogin,
    verifyLogin,
    loadDashboard,
    logout,
    userSearch,
    creatuserpannel,
    adminDashboard,
    createUser,
    getUsers,
    blockUser,
    unblockUser,
    toggleUserBlock,
    listOrderedProducts 
  
   
   
    
}