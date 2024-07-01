const mongoose = require('mongoose');

const cartSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming you have a 'User' model
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'products', // Reference the Product model ('products' instead of 'Product')
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        total: {
            type: Number,
            default: 0
        },
    }],
    grandTotal: {
        type: Number,
        default: 0,
        required: true
    },
    couponApplied: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('Cart', cartSchema);
