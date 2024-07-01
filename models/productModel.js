    const mongoose = require('mongoose');
    const Schema = mongoose.Schema; 

    const productSchema = mongoose.Schema({
        name: {
            type: String,
            required: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true, 
        },
        price: {
        type: Number,
        min: 0,
        required: true,
        },
        quantity: {
            type: Number,
            min: 0,
            required: true,
        },
        discount: {
            type: Number,
            default: 0,
        },
        description: { 
            type: String,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            default: false 
        },
        pictures: {
            type: Array, 
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'blocked'],
            default: 'active',
        },
        numReviews: {
            type: Number,
            default: 0
        },
        maxQuantityPerPerson: {
            type: Number,
            default: 5
        },
        coupon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon',
        },
        
        offer: {
            type: Schema.Types.ObjectId,
            ref: 'offer'
        } ,
        coupon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon'
        }
    }, {
        timestamps: true,
    });

    module.exports = mongoose.model('products', productSchema);
