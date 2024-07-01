const User = require('../models/userModels');
const Product = require("../models/productModel");
const Cart = require('../models/cartModel');




const loadCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        let user;

        if (userId) {
            // If user is logged in, retrieve user information
            user = await User.findById(userId);
            if (!user) {
                console.error('User not found');
            }
        }

        // Retrieve the user's cart from the database
        const userCart = await Cart.findOne({ user: userId }).populate('products.product');

        if (!userCart || !userCart.products || userCart.products.length === 0) {
            // If userCart is null, or products array is empty, render the cart view with empty products array
            return res.render('cart', { user: user, cart: userCart, products: [], discountedPrice: 0, outOfStock: false }); // Passing discounted price as 0 initially
        }

        // Calculate subtotal
        let subtotal = userCart.products.reduce((acc, cartItem) => acc + (cartItem.product.price * cartItem.quantity), 0);

        // Apply discount logic here (replace this with your actual discount calculation logic)
        const discountPercentage = 10; // Example: 10% discount
        const discount = (subtotal * discountPercentage) / 100;
        const discountedSubtotal = subtotal - discount;

        // Fetch quantities for each product in the cart
        const productsWithQuantity = await Promise.all(userCart.products.map(async (cartItem) => {
            const product = await Product.findById(cartItem.product);
            if (!product) {
                console.error(`Product with ID ${cartItem.product} not found`);
                return null; // or handle the error as you wish
            }
            return {
                product: product,
                quantity: cartItem.quantity
            };
        }));

        // Check if any product in the cart is out of stock
        const outOfStock = productsWithQuantity.some(item => item.product.quantity === 0);

        // Render the cart view with the user's cart data, subtotal, user details, and out-of-stock status
        res.render('cart', { user, cart: userCart, products: productsWithQuantity, discountedPrice: discountedSubtotal, outOfStock }); // Passing out-of-stock status to the view
    } catch (error) {
        console.error('Error loading cart:', error);
        res.status(500).send('Internal Server Error');
    }
};




const removeFromCart = async (req, res) => {
    try {
        // Check if the user is logged in
        if (!req.session.user_id) {
            // If not logged in, redirect to the login page
            return res.redirect('/login');
        }

        // Retrieve product ID from the request parameters
        const productId = req.params.productId;

        // Find the user's cart
        const cart = await Cart.findOne({ user: req.session.user_id });

        // If the cart doesn't exist, return an error
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        // Find the index of the product in the cart
        const productIndex = cart.products.findIndex(item => item.product.equals(productId));

        // If the product is not found in the cart, return an error
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found in the cart' });
        }

        // Remove the product from the cart
        cart.products.splice(productIndex, 1);

        // Calculate subtotal
        cart.subtotal = cart.products.reduce((total, item) => total + item.total, 0);

        // Set subtotal as grandTotal
        cart.grandTotal = cart.subtotal;

        // Save the updated cart
        await cart.save();

        res.status(200).json({ message: 'Product removed from cart successfully', cart });
    } catch (error) {
        console.error('Error removing product from cart:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



const getCartCount = async (req, res) => {
    try {
        const userId = req.session.user_id;
        if (!userId) {
            return res.status(200).json({ cartCount: 0 }); // If user is not logged in, cart count is 0
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(200).json({ cartCount: 0 }); // If cart doesn't exist, cart count is 0
        }

        const cartCount = cart.products.length;
        res.status(200).json({ cartCount });
    } catch (error) {
        console.error('Error fetching cart count:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const addToCart = async (req, res, next) => {
    try {
        const productId = req.params.productId;

        // Fetch product details
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Ensure user is authenticated and retrieve user ID from session
        const userId = req.session.user_id;
        if (!userId) {
            return res.redirect('/login');
        }

        // Check if the item is already in the cart
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, products: [] }); // Provide user ID when creating new cart
        }

        // Check if the product already exists in the cart
        const existingProduct = cart.products.find(item => item.product.toString() === productId);
        if (existingProduct) {
            // Calculate the new quantity after adding 1
            const newQuantity = existingProduct.quantity + 1;

            // Check if new quantity exceeds the maximum allowed quantity per person
            if (newQuantity > product.maxQuantityPerPerson) {
                return res.status(400).send(`Cannot add more than ${product.maxQuantityPerPerson} of this product per person.`);
            }

            // Update the existing product's quantity
            existingProduct.quantity = newQuantity;
            existingProduct.total = existingProduct.price * newQuantity;
        } else {
            // Check if adding this product would exceed the maximum allowed quantity per person
            if (1 > product.maxQuantityPerPerson) {
                return res.status(400).send(`Cannot add more than ${product.maxQuantityPerPerson} of this product per person.`);
            }

            // Add the product to the cart with an initial quantity of 1
            cart.products.push({
                product: product._id,
                name: product.name,
                price: product.price,
                quantity: 1,
                total: product.price,
            });
        }

        // Calculate subtotal
        cart.subtotal = cart.products.reduce((total, item) => total + item.total, 0);

        // Set subtotal as grandTotal
        cart.grandTotal = cart.subtotal;

        await cart.save();

        // Store the updated cart data in session storage
        req.session.cart = cart;

        res.redirect('/cart'); // Redirect to cart page
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).send('Internal Server Error');
    }
};




const updateQuantity = async (req, res) => {
    try {
        const productId = req.params.productId;
        const { quantity } = req.body;

        // Find the user's cart
        const cart = await Cart.findOne({ user: req.session.user_id });

        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        // Find the product in the cart
        const product = cart.products.find(item => item.product.equals(productId));

        if (!product) {
            return res.status(404).json({ error: 'Product not found in the cart' });
        }

        // Fetch the actual product details from the Product collection
        const productDetails = await Product.findById(productId);

        if (!productDetails) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if the new quantity exceeds the available quantity
        if (quantity > productDetails.quantity) {
            return res.status(400).json({ error: `Cannot add more than ${productDetails.quantity} of this product.` });
        }

        // Check if the new quantity exceeds the max quantity per person
        if (quantity > productDetails.maxQuantityPerPerson) {
            return res.status(400).json({ error: `Cannot add more than ${productDetails.maxQuantityPerPerson} of this product per person.` });
        }

        // Update the quantity of the product
        product.quantity = parseInt(quantity);

        // Update the total for the product
        product.total = product.price * product.quantity;

        // Calculate subtotal
        cart.subtotal = cart.products.reduce((total, item) => total + item.total, 0);

        // Set subtotal as grandTotal
        cart.grandTotal = cart.subtotal;

        await cart.save();

        res.status(200).json({ message: 'Quantity updated successfully', cart });
    } catch (error) {
        console.error('Error updating quantity:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    loadCart,
    addToCart,
    removeFromCart,
    getCartCount,
    updateQuantity

   
}