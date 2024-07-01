
const Product = require('../models/productModel');

const Wishlist = require('../models/wishlistModel');
const User = require('../models/userModels');

const showWishlistPage = async (req, res) => {
    try {
        const userId = req.session.user_id;

        if (!userId) {
            return res.status(401).json({ message: "Please login to view your wishlist." });
        }

        const user = await User.findById(userId);
        if (!user || user.blocked) {
            return res.status(403).json({ message: "Your account has been blocked. Please contact support." });
        }

        let wishlist = await Wishlist.findOne({ user: userId }).populate('products.product');

        if (!wishlist || !wishlist.products || wishlist.products.length === 0) {
            wishlist = []; // Set wishlist to an empty array if it's not found or empty
        } else {
            wishlist = wishlist.products; // Extract wishlist items from the populated document
        }

        res.render('wishlist', { user: user, wishlist: wishlist });
    } catch (error) {
        console.error('Error loading wishlist page:', error);
        res.status(500).send('Internal Server Error');
    }
};

const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.session.user_id;

        if (!userId) {
            return res.status(401).json({ message: "Please login to add items to wishlist." });
        }

        const user = await User.findById(userId);
        if (!user || user.blocked) {
            return res.status(403).json({ message: "Your account has been blocked. Please contact support." });
        }

        const wishlistItem = {
            product: productId,
            // Add other product details if needed
        };

        let wishlist = await Wishlist.findOneAndUpdate(
            { user: userId },
            { $push: { products: wishlistItem } },
            { new: true, upsert: true }
        ).populate('products.product');

        wishlist = wishlist.products; // Extract wishlist items from the populated document

        res.status(200).json({ message: "Product added to wishlist successfully.", wishlist });
    } catch (error) {
        console.error("Error adding product to wishlist:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.session.user_id;

        if (!userId) {
            return res.status(401).json({ message: "Please login to remove items from wishlist." });
        }

        const user = await User.findById(userId);
        if (!user || user.blocked) {
            return res.status(403).json({ message: "Your account has been blocked. Please contact support." });
        }

        const wishlist = await Wishlist.findOneAndUpdate(
            { user: userId },
            { $pull: { products: { product: productId } } },
            { new: true }
        );

        res.status(200).json({ message: "Product removed from wishlist successfully.", wishlist });
    } catch (error) {
        console.error("Error removing product from wishlist:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


const getWishlistCount = async (req, res) => {
    try {
        const userId = req.session.user_id;

        if (!userId) {
            return res.status(401).json({ message: "Please login to view your wishlist." });
        }

        const wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) {
            return res.json({ wishlistCount: 0 });
        }

        res.json({ wishlistCount: wishlist.products.length });
    } catch (error) {
        console.error('Error fetching wishlist count:', error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



module.exports = {
    showWishlistPage,
    addToWishlist,
    removeFromWishlist,
    getWishlistCount
};
