const path = require('path');

const PDFDocument = require('pdfkit');
const Checkout = require('../models/checkoutModel');
const User = require('../models/userModels');
const Address = require('../models/addressModel');
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const Coupon = require('../models/couponModel');
const Wallet = require('../models/walletModel');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const loadCheckout = async (req, res) => {
    try {
        const loggedIn = req.session.user_id ? true : false;
        const user = loggedIn ? await User.findById(req.session.user_id) : null;

        if (!user) {
            // Handle case where user is not found
            // For example, redirect to login page
            return res.redirect('/login');
        }

        const cart = loggedIn ? await Cart.findOne({ user: req.session.user_id }).populate('products.product') : null;
        const addresses = loggedIn ? await Address.find({ userId: req.session.user_id }) : [];

        let discountedPrice = null;
        if (req.session.discountedPrice) {
            discountedPrice = req.session.discountedPrice;
        }

        res.render('checkout', { loggedIn, user, cart, addresses, discountedPrice });
    } catch (error) {
        console.error('Error loading checkout page:', error);
        res.status(500).send('Internal Server Error');
    }
};

const createCheckout = async (req, res) => {
    try {
        const { userId, selectedAddresses, paymentMethod, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

        let orderStatus = 'pending';

        if (paymentMethod === 'Cash on Delivery') {
            orderStatus = 'completed';
        } else if (paymentMethod === 'Razorpay') {
            const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
            shasum.update(`${razorpayOrderId}|${razorpayPaymentId}`);
            const digest = shasum.digest('hex');

            if (digest === razorpaySignature) {
                orderStatus = 'completed';
            } else {
                orderStatus = 'pending';
            }
        }

        // Load or create user's wallet
        let wallet = await Wallet.findOne({ userId: userId });
        if (!wallet) {
            wallet = new Wallet({
                userId: userId,
                balance: 0,
                transactions: []
            });
            await wallet.save();
        }

        // Load user's cart
        const cart = await Cart.findOne({ user: userId }).populate('products.product');
        if (!cart || !cart.products || cart.products.length === 0) {
            return res.status(404).json({ error: 'Cart is empty or not found' });
        }

        const products = [];
        let totalPrice = 0;

        for (const item of cart.products) {
            const { product, price, quantity } = item;
            const productDetails = await Product.findById(product);

            if (productDetails) {
                productDetails.quantity -= quantity;
                await productDetails.save();

                products.push({
                    product: productDetails._id,
                    name: productDetails.name,
                    price: price,
                    quantity: quantity
                });

                totalPrice += price * quantity;
            }
        }

        // Check if payment is through wallet and if wallet balance is sufficient
        if (paymentMethod === 'Wallet' && wallet.balance < totalPrice) {
            return res.status(400).json({ error: 'Insufficient balance in wallet' });
        }

        // Deduct purchase amount from wallet balance and save transaction
        if (paymentMethod === 'Wallet') {
            const transaction = {
                type: 'debit',
                amount: totalPrice,
                description: 'Payment for order'
            };

            wallet.transactions.push(transaction);
            wallet.balance -= totalPrice;
            await wallet.save();

            orderStatus = 'completed'; // Set order status to 'completed' for wallet payment
        }

        let discountAmount = req.session.discountAmount || 0;
        let finalPrice = req.session.discountedPrice || totalPrice;

        const checkout = new Checkout({
            user: userId,
            addresses: selectedAddresses,
            paymentMethod: paymentMethod,
            products: products,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
            coupon: req.session.couponId || null,
            discountAmount: discountAmount,
            status: orderStatus // Update the order status here
        });

        await checkout.save();

        cart.products = [];
        await cart.save();

        if (paymentMethod === 'Wallet') {
            res.redirect(`/order?status=completed`);
        } else {
            res.status(201).json({ message: 'Checkout data saved successfully', checkout });
        }
    } catch (error) {
        console.error('Error creating checkout:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


// List Orders
const listOrders = async (req, res) => {
    try {
        const userId = req.session.user_id;
        if (!userId) {
            return res.redirect('/login');
        }

        const user = await User.findById(userId);
        if (!user || user.is_blocked) {
            req.session.destroy();
            return res.redirect('/login');
        }

        const checkouts = await Checkout.find({ user: userId }).sort({ createdAt: -1 });

        const ordersWithProductsAndStatus = await Promise.all(checkouts.map(async (checkout) => {
            const products = [];
            let totalPrice = 0;

            for (const productInfo of checkout.products) {
                const { product, price, quantity } = productInfo;
                const productDetails = await Product.findById(product);

                if (productDetails) {
                    products.push({
                        product: productDetails,
                        price,
                        quantity
                    });
                    totalPrice += price * quantity;
                }
            }

            let finalPrice = totalPrice - (checkout.discountAmount || 0);

            const wallet = await Wallet.findOne({ userId });

            return {
                ...checkout.toObject(),
                products,
                status: checkout.status,
                totalPrice: totalPrice.toFixed(2),
                finalPrice: finalPrice.toFixed(2),
                walletBalance: wallet ? wallet.balance.toFixed(2) : 0,
                transactions: wallet ? wallet.transactions : [],
                isPaidByWallet: checkout.paymentMethod === 'Wallet'
            };
        }));

        const filteredOrdersWithProductsAndStatus = ordersWithProductsAndStatus.filter(order => order);

        const currentPage = parseInt(req.query.page) || 1;
        const itemsPerPage = 4;
        const totalItems = filteredOrdersWithProductsAndStatus.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedOrders = filteredOrdersWithProductsAndStatus.slice(startIndex, endIndex);

        res.render('order', { 
            orders: paginatedOrders, 
            user, 
            currentPage, 
            totalPages 
        });
    } catch (error) {
        console.error('Error listing orders:', error);
        res.status(500).send('Internal Server Error');
    }
};

const getDetails = async (req, res) => {
    try {
        // Check if user is logged in
        const userId = req.session.user_id;
        if (!userId) {
            return res.redirect('/login');
        }

        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            req.session.destroy();
            return res.redirect('/login');
        }

        // Fetch the order details
        const { orderId } = req.body;
        const order = await Checkout.findById(orderId).populate('products.product').populate('addresses');
        
        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Calculate total amount
        let totalAmount = 0;
        order.products.forEach(product => {
            totalAmount += product.price * product.quantity;
        });

        // Render the order details page
        res.render('order-details', { orderId, order, userId, totalAmount, user });

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Server Error');
    }
};

// Cancel Order
const cancelOrder = async (req, res) => {
    try {
        const { userId, orderId, refundAmount } = req.body;

        if (!userId || !orderId || refundAmount === undefined) {
            console.log('Validation error: Missing fields', { userId, orderId, refundAmount });
            return res.status(400).send('userId, orderId, and refundAmount are required');
        }

        let wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            console.log('Wallet not found for userId:', userId);
            return res.status(404).send('Wallet not found');
        }

        const validRefundAmount = parseFloat(refundAmount);
        if (isNaN(validRefundAmount)) {
            console.log('Invalid refund amount:', refundAmount);
            return res.status(400).send('Invalid refund amount');
        }

        const currentBalance = wallet.balance || 0;
        const newBalance = currentBalance + validRefundAmount;

        if (isNaN(newBalance)) {
            console.log('Invalid balance calculation:', { currentBalance, validRefundAmount });
            return res.status(500).send('Invalid balance calculation');
        }

        const refundTransaction = {
            type: 'credit',
            amount: validRefundAmount,
            description: `Refund for order ${orderId}`
        };

        wallet.transactions.push(refundTransaction);
        wallet.balance = newBalance;

        await wallet.save();

        const checkout = await Checkout.findOneAndUpdate({ _id: orderId }, { status: 'cancelled' });

        if (!checkout) {
            console.log('Checkout not found for orderId:', orderId);
            return res.status(404).send('Checkout not found');
        }

        console.log('Order cancelled and refund processed successfully for orderId:', orderId);
        res.status(200).send('Order cancelled and refund processed successfully');
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Return Order
const returnOrder = async (req, res) => {
    const { orderId, productId, quantity } = req.body;

    try {
        const order = await Checkout.findById(orderId).populate('products.product').populate('returnedProducts.product');
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const productInOrder = order.products.find(p => p.product._id.toString() === productId);
        if (!productInOrder) {
            return res.status(404).json({ error: 'Product not found in order' });
        }

        const existingReturnedProduct = order.returnedProducts.find(rp => rp.product._id.toString() === productId);
        if (existingReturnedProduct) {
            existingReturnedProduct.quantity += quantity;
        } else {
            order.returnedProducts.push({ product: productId, quantity });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found in inventory' });
        } else {
            product.quantity += quantity;
            await product.save();
        }

        const allProductsReturned = order.products.every(p =>
            order.returnedProducts.some(rp => rp.product._id.toString() === p.product._id.toString() && rp.quantity >= p.quantity)
        );

        if (allProductsReturned) {
            order.status = 'returned';
        }

        await order.save();

        res.status(200).json({ message: 'Order returned successfully' });
    } catch (error) {
        console.error('Error returning order:', error);
        res.status(500).json({ error: 'Failed to return order' });
    }
};

// Create Razorpay Order
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createRazorpayOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR' } = req.body;

        // Convert amount to the smallest currency unit
        const amountInSmallestUnit = Math.round(amount * 100);

        // Validate amount range
        const maxAmountAllowed = 100000000; // Example max amount
        if (amountInSmallestUnit > maxAmountAllowed) {
            return res.status(400).json({ error: 'Amount exceeds maximum amount allowed by Razorpay' });
        }

        const options = {
            amount: amountInSmallestUnit,
            currency: currency,
        };

        // Create order with Razorpay
        const order = await razorpayInstance.orders.create(options);

        // Log the order to see its structure
        console.log('Razorpay order created:', order);

        // Check if order and order.status exist
        if (!order || !order.status) {
            console.error('Invalid Razorpay order response:', order);
            return res.status(500).json({ error: 'Invalid Razorpay order response' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



    
    

// Load User Coupons Page
const loadUserCouponsPage = async (req, res) => {
    try {
        const userId = req.session.user_id;
        if (!userId) {
            return res.redirect('/login');
        }

        const cart = await Cart.findOne({ user: userId }).populate('products.product');
        if (!cart || cart.products.length === 0) {
            return res.render('coupon', { coupons: [] });
        }

        const totalPrice = cart.products.reduce((total, item) => total + (item.price * item.quantity), 0);

        const coupons = await Coupon.find({ minAmount: { $lte: totalPrice }, status: true });

        res.render('coupon', { coupons });
    } catch (error) {
        console.error('Error loading coupons page:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Apply Coupon
const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user_id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please log in to apply a coupon' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const coupon = await Coupon.findOne({ couponCode, status: true });
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found or expired' });
        }

        if (user.appliedCoupons.includes(coupon._id)) {
            return res.status(400).json({ success: false, message: 'You have already applied this coupon' });
        }

        const cart = await Cart.findOne({ user: userId }).populate('products.product');
        const totalPrice = cart.products.reduce((total, item) => total + (item.price * item.quantity), 0);

        if (totalPrice < coupon.minAmount) {
            return res.status(400).json({ success: false, message: `Total amount should be at least ${coupon.minAmount} to apply this coupon` });
        }

        const discount = (totalPrice * coupon.discountPercent) / 100;
        const discountedPrice = totalPrice - discount;

        req.session.discountedPrice = discountedPrice;
        req.session.couponApplied = true;
        req.session.couponCode = couponCode;
        req.session.couponId = coupon._id;
        req.session.discountAmount = discount;

        user.appliedCoupons.push(coupon._id);
        await user.save();

        res.json({ success: true, discountedPrice });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};


const downloadInvoice = async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await Checkout.findById(orderId)
            .populate('user')
            .populate('products.product')
            .populate('addresses');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Create a PDF document in memory
        const doc = new PDFDocument();

        // Setup headers and footers for the PDF
        res.setHeader('Content-disposition', `attachment; filename=invoice-${orderId}.pdf`);
        res.setHeader('Content-type', 'application/pdf');

        // Stream the PDF document to the response
        doc.pipe(res);

        // Set the font to Times New Roman
        doc.font('Times-Roman');

        // Generate PDF content
        const shopName = "Glow Spot"; // Replace with your actual shop name
        doc.fontSize(30).text(shopName, { align: 'center' });
        doc.moveDown();
        doc.fontSize(25).text('Invoice', { align: 'center' });
        doc.fontSize(15).text(`Order ID: ${order._id}`, { align: 'center' });
        doc.fontSize(10).text(`Date: ${order.createdAt.toDateString()}`, { align: 'center' });
        doc.moveDown();
        doc.moveDown();
        doc.fontSize(14).text(`Customer Name: ${order.user.name}`);
        doc.text(`Customer Email: ${order.user.email}`);

        if (order.addresses && order.addresses.length > 0) {
            const address = order.addresses[0]; // Assuming you want the first address
            doc.text(`Customer Address: ${address.street}, ${address.city}, ${address.state}, ${address.zipCode}`);
        } else {
            doc.text(`Customer Address: Address Not Available`);
        }

        doc.text(`Payment Method: ${order.paymentMethod}`); // Include the payment method

        doc.moveDown();
        doc.moveDown();
        doc.fontSize(16).text('Products:');

        // Adjusting the x-coordinates and column widths
        const columnWidths = [60, 150, 100, 100, 100]; // Adjust these widths as needed
        const startX = 50; // Adjust this to move the table left or right

        const drawTableRow = (doc, y, fillColor, textColor, ...columns) => {
            doc.fontSize(12);
            doc.fillColor(fillColor).rect(startX, y - 2, columnWidths.reduce((a, b) => a + b), 30).fill(); // Increased rectangle height to 30
            columns.forEach((text, i) => {
                doc.fillColor(textColor).text(text, startX + columnWidths.slice(0, i).reduce((acc, w) => acc + w, 0), y, { width: columnWidths[i], align: 'center' });
            });
        };

        // Drawing header row with background color
        drawTableRow(doc, doc.y, 'gray', 'white', 'S.No.', 'Product Name', 'Price', 'Quantity', 'Total');

        // Table Rows
        let y = doc.y + 30;
        let serialNumber = 1;
        order.products.forEach(product => {
            const total = (product.price * product.quantity).toFixed(2);
            drawTableRow(doc, y, 'white', 'black', serialNumber, product.product.name, `$${product.price.toFixed(2)}`, product.quantity, `$${total}`);

            y += 30; // Increase the line height by 30 pixels
            serialNumber++;
        });

        // Draw a line under the last row
        doc.moveTo(startX, y).lineTo(startX + columnWidths.reduce((a, b) => a + b), y).stroke();

        // Finalize the PDF and end the document
        doc.end();
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const updateOrderStatus = async (req, res) => {
    const { orderId, status } = req.body;
    try {
        // Find the order by its ID
        const order = await Checkout.findById(orderId);

        // If order not found, return 404 error
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        order.status = status;
        await order.save();
        res.status(200).json({ message: 'Order status updated successfully' });
    } catch (error) {
       
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Server error' });
    }
};


const createPendingOrder = async (req, res) => {
    try {
        const { userId, selectedAddresses, paymentMethod, amount, status } = req.body;

        // Load or create user's wallet
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({
                userId: userId,
                balance: 0,
                transactions: []
            });
            await wallet.save();
        }

        // Load user's cart
        const cart = await Cart.findOne({ user: userId }).populate('products.product');
        if (!cart || !cart.products || cart.products.length === 0) {
            return res.status(404).json({ error: 'Cart is empty or not found' });
        }

        const products = [];
        let totalPrice = 0;

        for (const item of cart.products) {
            const { product, price, quantity } = item;
            const productDetails = await Product.findById(product);

            if (productDetails) {
                products.push({
                    product: productDetails._id,
                    name: productDetails.name,
                    price: price,
                    quantity: quantity
                });

                totalPrice += price * quantity;
            }
        }

        let discountAmount = req.session.discountAmount || 0;
        let finalPrice = req.session.discountedPrice || totalPrice;

        const checkout = new Checkout({
            user: userId,
            addresses: selectedAddresses,
            paymentMethod: paymentMethod,
            products: products,
            amount: amount,
            discountAmount: discountAmount,
            status: status // Set the order status as pending
        });

        await checkout.save();

        cart.products = [];
        await cart.save();

        res.status(201).json({ message: 'Pending order created successfully', checkout });
    } catch (error) {
        console.error('Error creating pending order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Export controllers
module.exports = {
    loadCheckout,
    createCheckout,
    listOrders,
    getDetails,
    cancelOrder,
    returnOrder,
    createRazorpayOrder,
    loadUserCouponsPage,
    applyCoupon,
    downloadInvoice,
    updateOrderStatus,
    createPendingOrder
    
}