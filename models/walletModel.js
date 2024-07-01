const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    balance: { type: Number, default: 0 },
    transactions: [
        {
            amount: Number,
            type: { type: String, enum: ['debit', 'credit'], required: true },
            description: String,
            date: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
