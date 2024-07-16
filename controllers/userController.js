const User = require('../models/userModels');
const Otp = require('../models/otpModel');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');
const Category = require('../models/categoryModel');
const Product = require("../models/productModel");
const Cart= require('../models/cartModel')
const Address = require('../models/addressModel')
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// const PasswordResetToken = require('../models/PasswordResetTokenModel');
const { validationResult } = require('express-validator');



const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10); 
        return passwordHash;
    } catch (error) {
        console.log(error.message);
    }
}

const exist = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            res.send({ success: true });
        } else {
            res.send({ exists: true });
        }
    } catch (error) {
        console.log(error.message + ' exist fetch');
        res.status(500).send('Internal Server Error');
    }
};

const loginLoad = async(req,res)=>{
    try{
        if(!req.session.user_id){
        res.render('login');
        }else{
            res.redirect('/')
        }

    }catch(error){
        console.log(error.message);
    }
}

const verifyLogin = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        const userData = await User.findOne({ email: email });

        if (userData) {
            if (userData.blocked) {
                res.render('login', { message: 'Your account has been blocked. Please contact support for assistance.' });
                return;
            }

            const passwordMatch = await bcrypt.compare(password, userData.password);
            if (passwordMatch) {
                if (userData.is_verified === 0) {
                    res.render('login', { message: 'Please verify your email.' });
                } else {
                    req.session.user_id = userData._id;
                    res.redirect('/');
                }
            } else {
                res.render('login', { message: 'Email and password are incorrect.' });
            }
        } else {
            res.render('login', { message: 'Email and password are incorrect.' });
        }

    } catch (error) {
        console.log(error.message + 'home');
        res.status(500).send('Internal Server Error');
    }
}

const loadHome = async (req, res) => {
    try {
        let userData = null;
        let loggedIn = false;

        // Check if the user is logged in
        if (req.session.user_id) {
            // If logged in, fetch user data
            userData = await User.findOne({ _id: req.session.user_id });
            if (userData && !userData.is_blocked) {
                // If user is found and not blocked, set loggedIn to true
                loggedIn = true;
            } else {
                // If user is blocked, destroy the session and redirect to login
                req.session.destroy();
                return res.redirect('/login');
            }
        }

        // Fetch products and categories data from the database
        const products = await Product.find().populate('category').exec();
        const categories = await Category.find();

        // Render the 'home' template with user data, products data, and categories data
        res.render('home', { user: loggedIn ? userData : null, products, categories, loggedIn });

    } catch (error) {
        console.error('Error loading home:', error);
        res.status(500).send('Internal Server Error');
    }
};



const userLogout = async(req,res)=>{
    try {
        req.session.destroy();
        res.render('login', { message: 'Logout successfully' });
    } catch (error) {
        console.log(error.message);
    }
}


const search=async(req,res)=>{
    try{ 
        const h = req.body.h;
        const regex = new RegExp(`^${h}`, 'i'); 
        const jj= await model.find({$or:[{name:regex},{email:regex}]});
        res.send({jj})
    }catch(err){
        console.log(err.message)
    }
}

const loadAuth  = (req,res)=>{
    res.render('login')
}

const successGoogleLogin = (req,res)=>{
    if(!req.user)
    res.redirect('/failure');
    console.log(req.user);
     console.log('Welcome' + req.user.email)

    res.redirect('/')
}

const failureGoogleLogin = (req,res)=>{
    res.send("Error")
}

const sendOtpMail = async (name, email, otp, user_Id) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: "nandanamaswathi60@gmail.com",
            to: email,
            subject: "OTP for Signup to Glow Spot",
            html: `<h3>Hello ${name}, Welcome to FurniHub</h3>
            <br><p>Enter ${otp} on the signup page to register</p>
            <br><p>This code expires after 2 minutes</p>`
        };

        const newUserOTP = new Otp({
            userId: user_Id,
            otp: otp,
            createdAt: Date.now(),
            expiresAt: Date.now() + 120000,
        });

        await newUserOTP.save();

        const info = await transporter.sendMail(mailOptions);
        console.log("Email has been sent:", info.response);

    } catch (error) {
        console.log("Error sending OTP mail:", error.message);
        throw new Error("Failed to send OTP");
    }
};

const loadRegister = async (req, res) => {
    try {
        res.render('registration',{message:""});
    } catch (error) {
        console.log(error.message);
    }
};

const insertUser = async (req, res) => {
    try {
        const { name, email, password, confirmPassword, mno } = req.body;

        // Check if passwords match
        if (password !== confirmPassword) {
            // Pass the error message to the registration page
            return res.render('registration', { message: "Passwords do not match" });
        }

        const emailExists = await User.findOne({ email });

        if (emailExists) {
            return res.render('registration', { message: "This Email already used" });
        } else {
            const hashedPassword = await securePassword(password);

            const user = new User({
                name,
                email,
                password: hashedPassword,
                mobile: mno,
                verified: false,
                is_admin: 0,
                is_blocked: false
            });

            const userData = await user.save();

            if (userData) {
                const otp = generateOTP();
                console.log(otp);
                await sendOtpMail(name, email, otp, userData._id);

                req.session.user_id = userData._id;

                return res.redirect('/otp-verification');
            } else {
                return res.render('registration');
            }
        }
    } catch (error) {
        console.log("Error inserting user:", error.message);
        return res.status(500).send('Internal Server Error');
    }
};



const generateOTP = () => {
    const digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < 4; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
};

const loadOtp = async (req, res) => {
    try {
        res.render('otp',{message:""});
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
};

const verifyOtp = async (req, res) => {

    try {
        const checkotp = req.body.otp;
        const a = await Otp.findOne({otp:checkotp}) 
        if(!a){
            console.log('incorect Otp')
            return  res.render('otp',{message: "incorrect OTP"});
        }
        const userId = a.userId
        
        if (!userId || !checkotp) {
            console.log("Missing userId or otp in request body");
            return res.render('otp', { message: "Please Enter OTP" });
        }

        const otpRecord = await Otp.findOne({ userId: userId }).sort({ createdAt: -1 });

        if (!otpRecord) {
            console.log("No OTP record found for user:", userId);
            return res.render('otp', { message: "Invalid OTP, please try again" });
        }

        if (checkotp === otpRecord.otp && Date.now() < otpRecord.expiresAt) {
            const user = await User.findById(userId);
            if (!user) { 
                console.log("User not found:", userId);
                return res.render('otp',{message:"Invalied user"})
            }
            user.verified = true;
            await user.save();

            await otpRecord.deleteOne();

            console.log("OTP verified successfully for user:", userId);
            return res.redirect('/');
        } else {
            console.log("Invalid OTP or expired for user:", userId);
            return res.render('otp', { message: "OTP expired or Invalid OTP, please try again" });
        }

    } catch (error) {
        console.error("Error verifying OTP:", error.message);
    }
};

const resendOtp = async (req, res) => {
    try {
        const myotp = await Otp.findOne().sort({ createdAt: -1 });

        if (!myotp) {
            console.log('OTP record not found');
            return res.render('otp', { message: "No OTP record found" });
        }

        const user = await User.findById(myotp.userId);

        if (!user) {
            console.log('User not found');
            return res.render('otp', { message: "User not found" });
        }

        const otp = generateOTP();
        console.log("Resend OTP:", otp);

        myotp.code = otp;
        await myotp.save();

        await sendOtpMail(user.name, user.email, otp, myotp.userId);

        return res.redirect('/otp-verification');
    } catch (error) {
        console.error("Error resending OTP:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// Helper function to escape special characters in regex
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}


const loadCategory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 9;
        const skip = (page - 1) * pageSize;
        const searchQuery = req.query.search || '';
        const sort = req.query.sort || 'default';
        const categoryFilter = req.query.category || 'all';
        const clearFilter = req.query.clear || false;
        let query = {};

        // If clear filter is true, show no products
        if (clearFilter) {
            query = { _id: null }; // This will match no products
        } else {
            // Search Query
            if (searchQuery) {
                const regex = new RegExp(escapeRegex(searchQuery), 'gi');
                query.$or = [
                    { 'category.name': regex },
                    { name: regex }
                ];
            }

            // Category Filter
            if (categoryFilter !== 'all') {
                const category = await Category.findOne({ name: categoryFilter, status: 'active', deleted: false });
                if (category) {
                    query.category = category._id;
                }
            }
        }

        // Fetch active categories
        const categories = await Category.find({ status: 'active', deleted: false });

        // Sorting Logic
        let sortOption = {};
        switch (sort) {
            case 'price-high-low':
                sortOption = { price: -1 };
                break;
            case 'price-low-high':
                sortOption = { price: 1 };
                break;
            case 'alpha-asc':
                sortOption = { name: 1 };
                break;
            case 'alpha-desc':
                sortOption = { name: -1 };
                break;
            default:
                sortOption = {};
                break;
        }

        // Fetch products with active status and related active categories
        const products = await Product.find({ status: 'active', ...query })
            .skip(skip)
            .limit(pageSize)
            .sort(sortOption)
            .populate({
                path: 'category',
                match: { status: 'active', deleted: false },
                populate: {
                    path: 'offer',
                    match: { status: true }
                }
            });

        // Calculate discounted prices for products with offers
        for (const product of products) {
            if (product.category && product.category.offer) {
                const discountPercentage = product.category.offer.discount;
                product.discountedPrice = discountPercentage ? (product.price * (1 - discountPercentage / 100)).toFixed(2) : product.price.toFixed(2);
            } else {
                product.discountedPrice = product.price.toFixed(2);
            }
        }

        // Count total active products matching the search query
        const totalProducts = await Product.countDocuments({ status: 'active', ...query });
        const totalPages = Math.ceil(totalProducts / pageSize);
        const user = req.session.user_id ? await User.findById(req.session.user_id) : null;

        res.render('category', { categories, products, currentPage: page, totalPages, totalProducts, user, searchQuery, sort, categoryFilter });
    } catch (error) {
        console.error('Error loading category:', error);
        res.status(500).send('Internal Server Error');
    }
};



// Helper function to escape regex special characters
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}


const loadProductDetails = async (req, res) => {
    try {
        const productId = req.params.productId;

        const product = await Product.findById(productId).populate('category offer');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        let discount = null;
        if (product.offer) {
            const discountPercentage = product.offer.discount;
            product.discount= discountPercentage ? (product.price * (1 - discountPercentage / 100)).toFixed(2) : product.price.toFixed(2);
        } else {
            product.discount = product.price.toFixed(2);
        }
        await product.save();

        const relatedProducts = await Product.find({ category: product.category }).limit(4);

        const user = req.session.user_id ? await User.findById(req.session.user_id) : null;

        res.render('product-details', { product, relatedProducts, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
}
const loadProfile = async (req, res) => {
    try {
        const userId = req.session.user_id; // Assuming you store user ID in the session
        if (!userId) {
            // If user is not logged in, redirect to login page or handle accordingly
            return res.redirect('/login');
        }

        const user = await User.findById(userId);
        if (!user) {
            // If user is not found, handle accordingly
            return res.status(404).send('User not found');
        }

        res.render('userProfile', { user });
    } catch (error) {
        console.error('Error loading profile:', error);
        res.status(500).send('Internal Server Error');
    }
};

const loadEditProfile = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const user = await User.findById(userId);

        if (!user) {
            console.error('User not found');
            return res.status(404).send('User not found');
        }

        res.render('profileEdit', { user }); // Pass the 'user' object to the 'profileEdit' view
    } catch (error) {
        console.error('Error loading edit profile:', error);
        res.status(500).send('Internal Server Error');
    }
};



const loadChangePasswordForm = async (req, res) => {
    try {
        const user = await User.findById(req.session.user_id);
        res.render('changePassword', { user });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

// Handle Change Password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.user_id;

        const user = await User.findById(userId);

        if (!user) {
            console.error('User not found');
            return res.status(404).send('User not found');
        }

        // Check if current password matches
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            return res.render('changePassword', { user, message: 'Current password is incorrect' });
        }

        // Check if new password and confirm password match
        if (newPassword !== confirmPassword) {
            return res.render('changePassword', { user, message: 'New password and confirm password do not match' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user's password
        user.password = hashedPassword;
        await user.save();

        // Redirect to userProfile after successful password change
        res.redirect('/userProfile');

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};
const loadAddress = async (req, res) => {
    try {
        const loggedin = req.session.user_id ? true : false;
        const user = req.session.user_id ? await User.findById(req.session.user_id) : null;
        const addresses = req.session.user_id ? await Address.find({ userId: req.session.user_id }) : [];

        res.render('address', { loggedin, user, addresses });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const loadaddAddress = async (req, res) => {
    try {
        let user = null;

        if (req.session.user_id) {
            user = await User.findById(req.session.user_id);
        }

        res.render('addAddress', { user });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const addAddress = async (req, res) => {
    try {
        const { street, city, state, postalCode, country } = req.body;

        const newAddress = new Address({
            userId: req.session.user_id,
            street,
            city,
            state,
            postalCode,
            country
        });

        await newAddress.save();

        res.redirect('/address');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the address by id and delete it
        await Address.findByIdAndDelete(id);

        res.redirect('/address'); // Redirect to the address management page after deletion
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


const loadEditAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const address = await Address.findById(id);

        if (!address) {
            return res.status(404).send('Address not found');
        }

        const loggedin = req.session.user_id ? true : false;
        const user = req.session.user_id ? await User.findById(req.session.user_id) : null;

        res.render('editAddress', { loggedin, user, address });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const { street, city, state, postalCode, country } = req.body;

        // Find the address by id and update it
        await Address.findByIdAndUpdate(id, { street, city, state, postalCode, country });

        res.redirect('/address'); // Redirect to the address management page after updating
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};








const loadThankyou = async(req,res)=>{
    try {
        res.render('thankyou')
    } catch (error) {
     console.log(error);   
    }
}





const updateProfile = async (req, res) => {
    try {
        const { name, email, contact } = req.body;
        const userId = req.session.user_id;

        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // If there are validation errors, render the form with error messages
            return res.render('profileEdit', { user: { name, email, contact }, errors: errors.array() });
        }

        // No validation errors, proceed with updating the profile
        await User.findByIdAndUpdate(userId, { name, email, contact });

        res.redirect('/userProfile'); // Redirect to the profile page after updating
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).send('Internal Server Error');
    }
};
const { body } = require('express-validator');

// Validation rules for the 'updateProfile' route
const updateProfileValidationRules = () => {
    return [
        body('name').trim().notEmpty().withMessage('Name is required').isAlpha().withMessage('Name must contain only letters'),
        body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email format'),
        body('contact').trim().notEmpty().withMessage('Contact number is required')
    ];
}

   





module.exports = {
    loadRegister,
    insertUser,
    loginLoad,
    verifyLogin,
    loadHome,
    userLogout,
    search,
    loadAuth,
    successGoogleLogin,
    failureGoogleLogin,
    exist,
    loadOtp,
    resendOtp,
    verifyOtp,
    loadCategory,
    loadProductDetails,
    loadProfile,
    loadEditProfile,
    // updateProfile,
    loadChangePasswordForm,
    changePassword,
    loadAddress,
    loadaddAddress,
    addAddress,
    deleteAddress,
    loadEditAddress,
    updateAddress,
    loadThankyou,
    updateProfileValidationRules,
    updateProfile
   

    
}
