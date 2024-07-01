const Wallet = require('../models/walletModel');
const User = require('../models/userModels');

// Function to load the wallet page
const loadWallet = async (req, res) => {
    try {
        const userId = req.session.user_id;

        // Redirect to login if no userId in session
        if (!userId) {
            return res.redirect('/login');
        }

        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            req.session.destroy();
            return res.redirect('/login');
        }

        // Find or create the user's wallet
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({
                userId,
                balance: 0,
                transactions: []
            });
            await wallet.save();
        }

        // Sort transactions by date in descending order (latest first)
        wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Pagination logic
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 3;
        const skip = (page - 1) * limit;
        const totalTransactions = wallet.transactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);

        // Get transactions for the current page
        const transactions = wallet.transactions.slice(skip, skip + limit);

        // Render the wallet page with user, balance, transactions, and pagination info
        res.render('wallet', {
            user,
            balance: wallet.balance,
            transactions,
            currentPage: page,
            totalPages,
            limit // Pass the limit to the view
        });
    } catch (error) {
        console.error('Error loading wallet page:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Function to add a transaction
const addTransaction = async (req, res) => {
    try {
        const { userId, type, amount, description } = req.body;

        // Validate input fields
        if (!userId || !type || !amount || !description) {
            return res.status(400).send('All fields are required');
        }

        // Find the wallet by userId
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            return res.status(404).send('Wallet not found');
        }

        // Create a new transaction
        const transaction = {
            amount,
            type,
            description,
            date: new Date() // Record the current date
        };

        // Add the transaction to the wallet and update the balance
        wallet.transactions.push(transaction);
        wallet.balance += type === 'credit' ? amount : -amount;

        // Save the updated wallet
        await wallet.save();

        res.status(200).send('Transaction added successfully');
    } catch (error) {
        console.error('Error adding transaction:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    loadWallet,
    addTransaction,
};
