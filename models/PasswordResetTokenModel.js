const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User' // Reference to the User model
    },
    token: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // Token expires in 1 hour (3600 seconds)
    }
});

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
