const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorySchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    status: {
        type: String,
        default: 'active'
    },
    deleted: {
        type: Boolean,
        default: false
    },
    coupon: {
        type: Schema.Types.ObjectId,
        ref: 'Coupon'
    },
    offer: {
        type: Schema.Types.ObjectId,
        ref: 'offer'
    }   
});

module.exports = mongoose.model('Category', categorySchema);
