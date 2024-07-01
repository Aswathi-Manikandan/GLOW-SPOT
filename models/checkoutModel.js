const mongoose = require('mongoose');

const checkoutSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    addresses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address'
    }],
    paymentMethod: {
        type: String,
        required: true
    },
    
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        default: null
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    products: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'products',
                required: true
            },
            price: {
                type: Number,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            }
        }
    ],
    returnedProducts: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'products',
                required: true
            },
            quantity: {
                type: Number,
                required: true
            }
        }
    ],
    status: {
        type: String,
        enum: ['placed', 'shipping', 'delivered', 'canceled', 'returned','pending','completed'],
        default: 'pending'
    },
    
    wallet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet',
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('Checkout', checkoutSchema);
