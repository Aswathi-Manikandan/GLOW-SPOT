require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const app = express();
const nocache = require("nocache");
const path = require('path');
const passport = require('passport');
const { errorHandler } = require('./middleware/errorMiddleware');
const Product = require('./models/productModel')

const mongoURL = process.env.MONGO_URL;


mongoose.connect('mongodb+srv://aswathiachus935:mxwY1RCscmSWEhoX@cluster0.usljjhr.mongodb.net/?', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});


app.use(errorHandler);


// Initialize Passport
require('./passport');

app.set('view engine', 'ejs');
app.set('views', './views/users');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const session = require('express-session');
const SECRET = process.env.SESSION_SECRET; 
if (!SECRET) {
    throw new Error('Session secret not found. Please provide a SESSION_SECRET in your environment.');
}
app.use(session({
    secret: SECRET, // Use session secret from environment variable
    resave: false,
    saveUninitialized: true,
})); 

app.use(nocache());
app.use(express.static(path.join(__dirname, 'public')));


// Import and use user routes
const userRoute = require('./routes/userRoute');
app.use('/', userRoute);

// Import and use admin routes
const adminRoute = require('./routes/adminRoute');
const products = require('./models/productModel');

app.use('/admin', adminRoute);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  res.locals.loggedin = !!req.session.user;
  next();
});

// Start the server
const PORT = process.env.PORT || 3000; // Use PORT environment variable if available
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
