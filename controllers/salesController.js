const Checkout = require('../models/checkoutModel');
const User = require('../models/userModels');
const Product = require('../models/productModel');
const Address = require('../models/addressModel');
const Coupon = require('../models/couponModel');

const moment = require('moment');
const PDFDocument = require('pdfkit');
require('pdfkit-table');
const ExcelJS = require('exceljs');
const pdfMake = require('pdfmake');

const loadSalesReport = async (req, res) => {
    try {
        let { filterType, startDate, endDate, page = 1 } = req.query;
        page = parseInt(page) || 1;
        const limit = 6; // Number of items per page
        const skip = (page - 1) * limit;

        if (filterType === 'daily') {
            startDate = moment().startOf('day').format('YYYY-MM-DD');
            endDate = moment().endOf('day').format('YYYY-MM-DD');
        } else if (filterType === 'weekly') {
            startDate = moment().startOf('isoWeek').format('YYYY-MM-DD');
            endDate = moment().endOf('isoWeek').format('YYYY-MM-DD');
        } else if (filterType === 'monthly') {
            startDate = moment().startOf('month').format('YYYY-MM-DD');
            endDate = moment().endOf('month').format('YYYY-MM-DD');
        } else if (filterType === 'yearly') {
            startDate = moment().startOf('year').format('YYYY-MM-DD');
            endDate = moment().endOf('year').format('YYYY-MM-DD');
        } else {
            if (!startDate) {
                startDate = moment().startOf('month').format('YYYY-MM-DD');
            }
            if (!endDate) {
                endDate = moment().endOf('day').format('YYYY-MM-DD');
            }
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        const deliveredOrders = await Checkout.find({
            status: 'delivered',
            createdAt: { $gte: start, $lte: end }
        })
            .populate('user')
            .populate('addresses')
            .populate('products.product')
            .populate('coupon')
            .skip(skip)
            .limit(limit);

        const totalOrders = await Checkout.countDocuments({
            status: 'delivered',
            createdAt: { $gte: start, $lte: end }
        });

        const salesReport = deliveredOrders.map(order => {
            const orderDetails = {
                user: order.user.name,
                paymentMethod: order.paymentMethod,
                status: order.status,
                products: order.products.map(p => ({
                    name: p.product.name,
                    pictures: p.product.pictures,
                    quantity: p.quantity,
                    price: p.price
                })),
                address: order.addresses.map(address => `${address.street}, ${address.city}, ${address.state}`).join(' | '),
                createdAt: moment(order.createdAt).format('YYYY-MM-DD'),
                coupon: order.coupon ? order.coupon.couponCode : null,
                discountAmount: order.discountAmount
            };
            return orderDetails;
        });

        const salesCount = deliveredOrders.length;
        const totalSalesAmount = deliveredOrders.reduce((total, order) => {
            const orderTotal = order.products.reduce((sum, product) => sum + product.price * product.quantity, 0);
            return total + orderTotal;
        }, 0);

        const totalDiscountAmount = deliveredOrders.reduce((total, order) => {
            return total + (order.discountAmount || 0);
        }, 0);

        const couponCount = deliveredOrders.filter(order => order.coupon).length;

        const totalPages = Math.ceil(totalOrders / limit);

        res.render('sales-report', { 
            salesReport, 
            startDate, 
            endDate, 
            salesCount, 
            totalSalesAmount, 
            totalDiscountAmount, 
            couponCount, 
            filterType,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error('Error loading sales report:', error);
        res.status(500).send('Internal Server Error');
    }
};


const generatePDFReport = async (req, res) => {
    try {
        let { filterType, startDate, endDate } = req.query;

        if (filterType === 'daily') {
            startDate = moment().startOf('day').format('YYYY-MM-DD');
            endDate = moment().endOf('day').format('YYYY-MM-DD');
        } else if (filterType === 'weekly') {
            startDate = moment().startOf('isoWeek').format('YYYY-MM-DD');
            endDate = moment().endOf('isoWeek').format('YYYY-MM-DD');
        } else if (filterType === 'monthly') {
            startDate = moment().startOf('month').format('YYYY-MM-DD');
            endDate = moment().endOf('month').format('YYYY-MM-DD');
        } else if (filterType === 'yearly') {
            startDate = moment().startOf('year').format('YYYY-MM-DD');
            endDate = moment().endOf('year').format('YYYY-MM-DD');
        } else {
            if (!startDate) {
                startDate = moment().startOf('month').format('YYYY-MM-DD');
            }
            if (!endDate) {
                endDate = moment().endOf('day').format('YYYY-MM-DD');
            }
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        const deliveredOrders = await Checkout.find({
            status: 'delivered',
            createdAt: { $gte: start, $lte: end }
        })
            .populate('user')
            .populate('addresses')
            .populate('products.product')
            .populate('coupon');

        const doc = new PDFDocument();
        let filename = `sales-report-${startDate}-to-${endDate}.pdf`;
        filename = encodeURIComponent(filename);
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        // Add company name and logo
        
        doc.fontSize(20).text('Sales Report', { align: 'center' });
        doc.fontSize(12).text(`Date Range: ${startDate} to ${endDate}`, { align: 'center' });
        doc.moveDown();

        const couponCount = deliveredOrders.filter(order => order.coupon).length;
        doc.fontSize(12).text(`Coupons Used: ${couponCount}`, { align: 'center' });
        doc.moveDown();

        const tableTop = 150;
        const itemMargin = 40; // Increased margin to increase row height
        let y = tableTop;

        // Adjusting the x-coordinates and column widths
        const columnWidths = [60, 60, 40, 40, 80, 80, 50, 60, 60, 60, 60];
        const startX = 50; // Adjust this to move the table left or right

        const drawTableRow = (doc, y, fillColor, textColor, ...columns) => {
            doc.fontSize(10);
            doc.fillColor(fillColor).rect(startX, y - 2, columnWidths.reduce((a, b) => a + b), 30).fill(); // Increased rectangle height to 30
            columns.forEach((text, i) => {
                doc.fillColor(textColor).text(text, startX + columnWidths.slice(0, i).reduce((acc, w) => acc + w, 0), y, { width: columnWidths[i], align: 'center' });
            });
        };

        // Drawing header row with background color
        drawTableRow(doc, y, 'gray', 'white', 'User', 'Products', 'Quantity', 'Total Price', 'Payment Method', 'Address', 'Date', 'Coupon', 'Discount Amount');
        y += 40; // Increased y increment to match increased row height

        deliveredOrders.forEach(order => {
            const productsList = order.products.map(p => p.product.name).join(', ');
            const quantitiesList = order.products.map(p => p.quantity).join(', ');
            const totalPrice = order.products.reduce((total, product) => total + product.price * product.quantity, 0).toFixed(2);
            const address = order.addresses.map(address => `${address.street}, ${address.city}, ${address.state}`).join(' | ');
            drawTableRow(doc, y, 'white', 'black', order.user.name, productsList, quantitiesList, totalPrice, order.paymentMethod, address, moment(order.createdAt).format('YYYY-MM-DD'), order.coupon ? order.coupon.couponCode : 'N/A', order.discountAmount ? order.discountAmount.toFixed(2) : '0.00');
            y += itemMargin;

            // Add a page break if the current row exceeds the page height
            if (y > doc.page.height - 50) {
                doc.addPage();
                y = tableTop;
                drawTableRow(doc, y, 'gray', 'white', 'User', 'Products', 'Quantity', 'Total Price', 'Payment Method', 'Address', 'Date', 'Coupon', 'Discount Amount');
                y += 40; // Increased y increment to match increased row height
            }
        });

        // Summary
        doc.text('Summary', startX, y + 20, { align: 'left' });
        doc.text(`Total Sales: ${deliveredOrders.length}`, startX, y + 40, { align: 'left' });
        const totalAmount = deliveredOrders.reduce((total, order) => {
            return total + order.products.reduce((sum, product) => sum + product.price * product.quantity, 0);
        }, 0).toFixed(2);
        doc.text(`Total Amount: ${totalAmount}`, startX, y + 60, { align: 'left' });
        const totalDiscount = deliveredOrders.reduce((total, order) => {
            return total + (order.discountAmount || 0);
        }, 0).toFixed(2);
        doc.text(`Total Discount: ${totalDiscount}`, startX, y + 80, { align: 'left' });
        doc.text(`Coupons Used: ${couponCount}`, startX, y + 100, { align: 'left' });

        doc.end();
        doc.pipe(res);

    } catch (error) {
        console.error('Error generating PDF report:', error);
        res.status(500).send('Internal Server Error');
    }
};


const generateExcelReport = async (req, res) => {
    try {
        // Fetch the sales data based on query parameters (same as loadSalesReport)
        let { filterType, startDate, endDate } = req.query;

        // Determine the date range based on filterType
        if (filterType === 'daily') {
            startDate = moment().startOf('day').format('YYYY-MM-DD');
            endDate = moment().endOf('day').format('YYYY-MM-DD');
        } else if (filterType === 'weekly') {
            startDate = moment().startOf('isoWeek').format('YYYY-MM-DD');
            endDate = moment().endOf('isoWeek').format('YYYY-MM-DD');
        } else if (filterType === 'monthly') {
            startDate = moment().startOf('month').format('YYYY-MM-DD');
            endDate = moment().endOf('month').format('YYYY-MM-DD');
        } else if (filterType === 'yearly') {
            startDate = moment().startOf('year').format('YYYY-MM-DD');
            endDate = moment().endOf('year').format('YYYY-MM-DD');
        } else {
            // If custom dates are provided
            if (!startDate) {
                startDate = moment().startOf('month').format('YYYY-MM-DD');
            }
            if (!endDate) {
                endDate = moment().endOf('day').format('YYYY-MM-DD');
            }
        }

        // Convert to date objects
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Find all delivered orders within the date range
        const deliveredOrders = await Checkout.find({
            status: 'delivered',
            createdAt: { $gte: start, $lte: end }
        })
            .populate('user')
            .populate('addresses')
            .populate('products.product')
            .populate('coupon');

        // Generate Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'User', key: 'user', width: 20 },
            { header: 'Products', key: 'products', width: 50 },
            { header: 'Quantity', key: 'quantity', width: 10 },
            { header: 'Price', key: 'price', width: 10 },
            { header: 'Total Price', key: 'totalPrice', width: 15 },
            { header: 'Payment Method', key: 'paymentMethod', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Address', key: 'address', width: 30 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Coupon', key: 'coupon', width: 15 },
            { header: 'Discount Amount', key: 'discountAmount', width: 15 }
        ];

        // Add coupon count
        const couponCount = deliveredOrders.filter(order => order.coupon).length;
        worksheet.addRow([]);
        worksheet.addRow([`Coupons Used: ${couponCount}`]);
        worksheet.addRow([]);

        deliveredOrders.forEach(order => {
            const productsList = order.products.map(p => p.product.name).join(', ');
            const quantitiesList = order.products.map(p => p.quantity).join(', ');
            const pricesList = order.products.map(p => p.price.toFixed(2)).join(', ');
            const totalPrice = order.products.reduce((total, product) => total + product.price * product.quantity, 0).toFixed(2);
            const address = order.addresses.map(address => `${address.street}, ${address.city}, ${address.state}`).join(' | ');
            worksheet.addRow({
                user: order.user.name,
                products: productsList,
                quantity: quantitiesList,
                price: pricesList,
                totalPrice,
                paymentMethod: order.paymentMethod,
                status: order.status,
                address,
                date: moment(order.createdAt).format('YYYY-MM-DD'),
                coupon: order.coupon ? order.coupon.couponCode : 'N/A',
                discountAmount: order.discountAmount ? order.discountAmount.toFixed(2) : '0.00'
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-to-${endDate}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating Excel report:', error);
        res.status(500).send('Internal Server Error');
    }
};


module.exports = {
    loadSalesReport,
    generatePDFReport,
    generateExcelReport 
};
