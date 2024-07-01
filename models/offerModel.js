const mongoose = require('mongoose');

const offer = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    startingDate: {
        type:Date
    },
    expiryDate: {
        type: Date,
        required: true
    },
    status: {
        type: Boolean,
        default: true
    },
    list:{type: Boolean,
        default: true}
})
offer.pre('find', async function () {
    const currentDate = new Date();
    await this.model.updateMany(
        { expiryDate: { $lt: currentDate }, status: true },
        { $set: { status: false } }
    );
  });
module.exports = mongoose.model('offer', offer)