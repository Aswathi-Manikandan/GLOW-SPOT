
const mongoose = require('mongoose');
const Category = require("../models/categoryModel");
const Product = require("../models/productModel");
const Coupon = require('../models/couponModel');
const Offer = require("../models/offerModel");
const Sharp = require("sharp");
const path = require("path");
const fs = require('fs');

const loadProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 7;
        const skip = (page - 1) * pageSize;

        const products = await Product.find().limit(pageSize).skip(skip).populate('category').populate('offer'); // Populate the 'coupon' field
        const totalCount = await Product.countDocuments();
        const totalPages = Math.ceil(totalCount / pageSize);
        const offers = await Offer.find(); // Fetch the offers
      
        res.render('product', {
            products,
            currentPage: page,
            totalPages: totalPages,
            offers, // Pass the offers to the template
           
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};


const loadAddProducts = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('productAdd', { categories });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const addProduct = async (req, res) => {
    try {
        const { name, category, price, quantity, description } = req.body;

        if (!name || !category || !price || !quantity || !description) {
            return res.status(400).send('All fields are required.');
        }

        const productImages = await Promise.all(req.files.map(async (file) => {
            try {
                const fileExtension = path.extname(file.originalname).toLowerCase();
                if (fileExtension === '.pdf') {
                    throw new Error('Invalid file type. PDF files are not allowed.');
                }

                const resizedFilename = `resized-${file.filename}`;
                const resizedPath = path.join(__dirname, '../public/product_images', resizedFilename);

                await Sharp(file.path)
                    .resize({ height: 600, width: 650, fit: 'fill' })
                    .toFile(resizedPath);

                return `/product_images/${resizedFilename}`;
            } catch (error) {
                console.error('Error processing and saving image:', error);
                throw error;
            }
        }));

        const product = new Product({
            name,
            category,
            price,
            quantity,
            description,
            pictures: productImages
        });

        await product.save();
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error adding product:', error);
        if (error.message.includes('Invalid file type')) {
            res.status(400).send(error.message);
        } else {
            res.status(500).send('Internal Server Error');
        }
    }
};



const loadEditProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const categories = await Category.find();
        const productData = await Product.findById(id);

       

        res.render('productedit', { categories, product: productData });

    } catch (error) {
        console.log(error.message);
    }
};




const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, category, price, quantity, description, deletedImages } = req.body;

        let product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Update product details
        product.name = name;
        product.category = category;
        product.price = price;
        product.quantity = quantity;
        product.description = description;

        // Handle deleting existing images
        if (deletedImages && deletedImages.length > 0) {
            const deletedImagesArray = Array.isArray(deletedImages) ? deletedImages : [deletedImages];

            deletedImagesArray.forEach((index) => {
                const imagePath = path.join(__dirname, '../public', product.pictures[index]);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            });

            product.pictures = product.pictures.filter((image, index) => !deletedImagesArray.includes(index.toString()));
        }

        // Handle adding new images
        if (req.files && req.files.length > 0) {
            const newImages = [];

            for (const file of req.files) {
                const fileExtension = path.extname(file.originalname).toLowerCase();

                if (!['.jpg', '.jpeg', '.png', '.gif'].includes(fileExtension)) {
                    return res.status(400).send('Invalid file type. Only JPG, JPEG, PNG, and GIF files are allowed.');
                }

                const resizedFilename = `resized-${file.filename}`;
                const resizedPath = path.join(__dirname, '../public/product_images', resizedFilename);

                await Sharp(file.path)
                    .resize({ height: 600, width: 650, fit: 'fill' })
                    .toFile(resizedPath);

                newImages.push(`/product_images/${resizedFilename}`);
            }

            product.pictures = product.pictures.concat(newImages);
        }

        await product.save();
        res.redirect('/admin/products');

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Internal Server Error');
    }
};


const deleteImage = async (req, res) => {
    try {
        const id = req.params.id;
        const imageIndex = req.body.imageIndex;

        let product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Remove the image at the specified index
        product.pictures.splice(imageIndex, 1);
        await product.save();

        res.redirect(`/admin/products/edit/${id}`);

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Internal Server Error');
    }
};






const toggleProductStatus = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Toggle product status between 'active' and 'blocked'
        product.status = product.status === 'active' ? 'blocked' : 'active';
        await product.save();

        res.redirect('/admin/products');
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const loadAllProduct = async (req, res) => {
    try {
        const userName = req.session.user ? req.session.user.name : null;
        const isLoggedIn = req.session.user ? true : false;
        const page = parseInt(req.query.page) || 1;
        const pageSize = 9;

        const skip = (page - 1) * pageSize;

        const products = await Product.find({ status: 'active' }).limit(pageSize).skip(skip).populate({ path: 'category', model: Category });

        const totalCount = await Product.countDocuments({ status: 'active' });

        const totalPages = Math.ceil(totalCount / pageSize);

        const categories = await Category.find();

        res.render('allproducts', {
            userName: userName,
            isLoggedIn: isLoggedIn,
            products: products,
            categories: categories,
            currentPage: page,
            totalPages: totalPages
        });

    } catch (error) {
        console.log(error.message);
    }
};

const product = async (req, res) => {
    try {
        const userName = req.session.user ? req.session.user.name : null;
        const isLoggedIn = req.session.user ? true : false;
        const id = req.params.id;

        const productData = await Product.findById(id).populate({ path: 'category', model: Category });

        const loocate = productData.category.name;

        let relatedProducts = [];

        if (loocate) {
            relatedProducts = await Product.find({
                $and: [
                    { name: { $ne: productData.name } },
                    { category: productData.category }
                ]
            }).limit(4).populate({ path: 'category', model: Category });

            if (relatedProducts.length === 0) {
                console.log("Related Products not found");
            }
        }

        


        res.render('product',{userName:userName,isLoggedIn:isLoggedIn,product:productData, relProducts: relatedProducts });

    } catch (error) {
        console.log(error.message);
    }
};

const updateProductOffer = async (req, res) => {
    try {
        const productId = req.params.id;
        const { offerId } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

       

        // Use new ObjectId instead of mongoose.Types.ObjectId
        product.offer = offerId ? new mongoose.Types.ObjectId(offerId) : null;
        await product.save();

        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error updating product offer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};






module.exports = {
    loadProducts,
    loadAddProducts,
    addProduct,
    loadEditProduct,
    editProduct,
    deleteImage,
    toggleProductStatus,
    loadAllProduct,
    product,
    updateProductOffer,
   
    
}