const Coupon = require('../models/couponModel');
const { check, validationResult } = require('express-validator');
const moment = require('moment');
const flash = require('connect-flash');

const ITEMS_PER_PAGE = 5; // Define how many items per page

exports.validateCoupon = [
    check('couponName').not().isEmpty().withMessage('Coupon Name is required'),
    check('couponCode').not().isEmpty().withMessage('Coupon Code is required'),
    check('availability').isInt({ min: 1 }).withMessage('Available Coupons must be a positive integer'),
    check('discountPercent').isInt({ min: 1, max: 100 }).withMessage('Discount Percentage must be between 1 and 100'),
    check('minAmount').isInt({ min: 0 }).withMessage('Minimum Amount must be a non-negative integer'),
    check('couponDescription').not().isEmpty().withMessage('Coupon Description is required'),
    check('expiryDate')
        .isISO8601().withMessage('Expiry Date must be a valid date')
        .custom((value) => {
            if (moment(value).isBefore(moment())) {
                throw new Error('Expiry Date must be in the future');
            }
            return true;
        }),
    check('minAmount')
        .custom((value, { req }) => {
            if (parseInt(value) <= parseInt(req.body.discountPercent)) {
                throw new Error('Minimum Amount must be higher than Discount Percentage');
            }
            return true;
        }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('editCoupon', { coupon: req.body, errors: errors.array() });
        }
        next();
    }
];

exports.loadCouponsPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const totalCoupons = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons / ITEMS_PER_PAGE);
        const coupons = await Coupon.find()
            .skip((page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE);

        res.render('coupons', {
            coupons,
            currentPage: page,
            totalPages,
            itemsPerPage: ITEMS_PER_PAGE
        });
    } catch (error) {
        console.error('Error loading coupons page:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.loadAddCouponPage = (req, res) => {
    res.render('addCoupon', { errors: [], formData: {} });
};

exports.addCoupon = async (req, res) => {
    try {
        const { couponName, couponCode, availability, discountPercent, minAmount, couponDescription, expiryDate } = req.body;

        // Check if coupon code already exists
        const existingCoupon = await Coupon.findOne({ couponCode });
        if (existingCoupon) {
            return res.status(400).send('Coupon code already exists');
        }

        const newCoupon = new Coupon({
            couponName,
            couponCode,
            availability,
            discountPercent,
            minAmount,
            couponDescription,
            expiryDate
        });

        await newCoupon.save();
        res.redirect('/admin/coupons');
    } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.loadEditCouponPage = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).send('Coupon not found');
        }

        const errors = req.flash('error'); // Retrieve flash messages

        res.render('editCoupon', { coupon, errors }); // Pass errors to the template
    } catch (error) {
        console.error('Error loading edit page:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Edit an existing coupon
exports.editCoupon = async (req, res) => {
    try {
        const { couponName, couponCode } = req.body;
        const { id } = req.params;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('editCoupon', { coupon: req.body, errors: errors.array() });
        }

        // Check if the coupon code already exists for a different coupon
        const existingCouponCode = await Coupon.findOne({ couponCode, _id: { $ne: id } });
        if (existingCouponCode) {
            req.flash('error', 'Coupon code already exists');
            return res.redirect(`/admin/coupons/edit/${id}`);
        }

        // Check if the coupon name already exists for a different coupon
        const existingCouponName = await Coupon.findOne({ couponName, _id: { $ne: id } });
        if (existingCouponName) {
            req.flash('error', 'Coupon name already exists');
            return res.redirect(`/admin/coupons/edit/${id}`);
        }

        await Coupon.findByIdAndUpdate(id, req.body);
        res.redirect('/admin/coupons');
    } catch (error) {
        console.error('Error editing coupon:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Delete a coupon
exports.deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await Coupon.findByIdAndDelete(id);
        res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
