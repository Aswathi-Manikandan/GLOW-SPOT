const Checkout = require('../models/checkoutModel');
const User = require('../models/userModels');
const Address = require('../models/addressModel');
const Product = require('../models/productModel');

const listOrdersAdmin = async (req, res) => {
    try {
        const perPage = 10; // Number of orders per page
        const page = req.query.page || 1;

        const totalOrders = await Checkout.countDocuments();
        const checkouts = await Checkout.find()
            .skip((perPage * page) - perPage)
            .limit(perPage)
            .populate('user')
            .populate('addresses')
            .populate('products.product');

        const ordersWithDetails = await Promise.all(checkouts.map(async (checkout) => {
            const user = checkout.user;
            const addressIds = checkout.addresses;
            const addresses = await Address.find({ _id: { $in: addressIds } });

            const products = checkout.products.map((item) => {
                if (!item.product) {
                    // If product is null or undefined, handle it accordingly
                    return {
                        name: 'Product Not Found',
                        price: item.price,
                        quantity: item.quantity,
                        totalPrice: (item.price * item.quantity).toFixed(2) // Ensure two decimal places
                    };
                }

                const totalPrice = item.price * item.quantity; // Calculate total price based on quantity
                return {
                    name: item.product.name,
                    price: item.price,
                    quantity: item.quantity,
                    totalPrice: totalPrice.toFixed(2) // Ensure two decimal places
                };
            });

            // Calculate the discount amount and final price
            const discountAmount = checkout.discountAmount || 0; // Assuming discountAmount is a field in checkout
            const originalTotalPrice = products.reduce((sum, product) => sum + parseFloat(product.totalPrice), 0);
            const finalPrice = originalTotalPrice - discountAmount;

            return {
                orderId: checkout._id,
                user: user ? user.name : 'User Not Found',
                addresses: addresses,
                paymentMethod: checkout.paymentMethod,
                products: products,
                discountAmount: discountAmount.toFixed(2), // Ensure two decimal places
                finalPrice: finalPrice.toFixed(2), // Ensure two decimal places
                status: checkout.status // Include the status in the response (including 'canceled')
            };
        }));

        res.render('adminOrders', {
            orders: ordersWithDetails,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / perPage)
        });
    } catch (error) {
        console.error('Error listing orders for admin:', error);
        res.status(500).send('Internal Server Error');
    }
};

const updateOrderStatus = async (req, res) => {
    const { orderId, newStatus } = req.body;

    try {
        const updatedOrder = await Checkout.findByIdAndUpdate(orderId, { status: newStatus }, { new: true });

        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.status(200).json({ message: 'Order status updated successfully', order: updatedOrder });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    listOrdersAdmin,
    updateOrderStatus
};
