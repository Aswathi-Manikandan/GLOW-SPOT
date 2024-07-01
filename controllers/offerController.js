

const Offer = require('../models/offerModel');



exports.loadOffersPage = async (req, res) => {
    try {
        const currentPage = req.query.page || 1; // Get current page from query parameter
        const perPage = 5; // Number of offers per page
        const totalOffers = await Offer.countDocuments();
        const totalPages = Math.ceil(totalOffers / perPage);
        const offers = await Offer.find()
            .skip((currentPage - 1) * perPage)
            .limit(perPage);
           

        res.render('offers', { offers, totalPages, currentPage });
    } catch (error) {
        console.error('Error loading offers:', error);
        res.status(500).send('Internal Server Error');
    }
};


// Load page to add a new offer
exports.loadAddOfferPage = (req, res) => {
    res.render('addOffer');
};

// Add new offer
exports.addOffer = async (req, res) => {
    try {
        const newOffer = new Offer(req.body);
        await newOffer.save();
        res.redirect('/admin/offers');
    } catch (error) {
        console.error('Error adding offer:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Load page to edit an existing offer
exports.loadEditOfferPage = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).send('Offer not found');
        }
        res.render('editOffer', { offer });
    } catch (error) {
        console.error('Error loading edit page:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Edit an existing offer
exports.editOffer = async (req, res) => {
    try {
        const { id } = req.params;
        await Offer.findByIdAndUpdate(id, req.body);
        res.redirect('/admin/offers');
    } catch (error) {
        console.error('Error editing offer:', error);
        res.status(500).send('Internal Server Error');
    }
};


exports.deleteOffer = async (req, res) => {
    try {
        const { id } = req.params;
        // Use Offer model to delete the offer by ID
        const deletedOffer = await Offer.findByIdAndDelete(id);
        if (!deletedOffer) {
            return res.status(404).send('Offer not found');
        }
        // Respond with success message
        res.status(200).send('Offer deleted successfully');
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.status(500).send('Internal Server Error');
    }
};