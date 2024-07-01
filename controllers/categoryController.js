
const mongoose = require('mongoose')
const Category = require("../models/categoryModel")
const Offer = require("../models/offerModel"); 
const Coupon = require("../models/couponModel");


//-----------------  load category page -----------------//

const ITEMS_PER_PAGE = 4; // Number of categories per page


const loadCategory = async (req, res) => {
    try {
        const page = +req.query.page || 1;
        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / ITEMS_PER_PAGE);

        const categories = await Category.find()
            .skip((page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE)
           
            .populate('offer'); // Populate the offer field

       
        const offers = await Offer.find(); // Fetch all available offers

        res.render('category', { categories, totalPages, currentPage: page, offers });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

//-----------------  load Addcategory page -----------------//

const loadAddCategory = async (req, res) => {
    try {
        
        res.render('addcategory',{message:""});
    } catch (error) {
        console.log(error.message);
    }
};


//-----------------  Addcategory (post) -----------------//

const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Check if a category with the same name already exists (case-insensitive)
        const existingCategory = await Category.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } });
        if (existingCategory) {
            return res.render('addcategory', { message: "This Category already exists try another one" });
        }

        const category = new Category({ name, description }); 

        await category.save();

        res.redirect('/admin/category');
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};


//----------------- Load EditCategory page -----------------//

const LoadEditCategory = async (req, res) => { 
    try {
        const id = req.params.id;
        
        const catData = await Category.findById(id); 
        
        if(catData) {
            res.render('editcategory',{message:"" , category:catData});
        } else {
            res.redirect('/admin/category');
        }
    } catch (error) {
        console.log(error.message);
    }
}


//-----------------  EditCategory (post) -----------------//

const editCategory = async (req, res) => {
    try {
        const categoryId = req.params.id; 
        const { name, description } = req.body;

        // Check if the edited category name already exists in another category (case-insensitive)
        const existingCategory = await Category.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') }, _id: { $ne: categoryId } });
        if (existingCategory) {
            const catData = await Category.findById(categoryId); 
            return res.render('editcategory', { message: "This Category is already exists  try another one", category: catData });
        }

        const category = await Category.findById(categoryId);

        if (!category) {
            console.log('Category not found');
            // Handle case where the category is not found
            return res.redirect('/admin/category');
        }

        category.name = name;
        category.description = description;

        await category.save();

        res.redirect('/admin/category');
        
    } catch (error) {
        console.log(error.message);
        // Render the editcategory page with an error message
        res.render('editcategory', { message: "Internal Server Error. Please try again later." });
    }
};





const searchCategory = async (req, res) => {
    try {
        const query = req.query.query;
        const categories = await Category.find({ name: { $regex: new RegExp(query, 'i') } });

        res.render('category', { categories });
    } catch (error) {
        console.error('Error searching categories:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const blockCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        category.deleted = true; // Soft delete by marking as deleted
        await category.save();

        res.redirect('/admin/category');
    } catch (error) {
        console.error('Error blocking category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const unblockCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        category.deleted = false; // Unblock by marking as not deleted
        await category.save();

        res.redirect('/admin/category');
    } catch (error) {
        console.error('Error unblocking category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};





const updateCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { offerId } = req.body;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        category.offer = offerId ? new mongoose.Types.ObjectId(offerId) : null;
        await category.save();

        res.redirect('/admin/category');
    } catch (error) {
        console.error('Error updating category offer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


module.exports = {
    loadCategory,
    loadAddCategory,
    addCategory,
    LoadEditCategory,
    editCategory,
    
    searchCategory,
    blockCategory,
    unblockCategory,
   
    updateCategoryOffer 
    
}