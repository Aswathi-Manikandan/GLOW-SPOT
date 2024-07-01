const User = require('../models/userModels');
const Otp = require('../models/otpModel');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Function to generate a random 4-digit OTP
const generateOTP = () => {
    const digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < 4; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
};

// Function to send OTP via email
const sendOtpMail = async (name, email, otp, userId) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: "nandanamaswathi60@gmail.com",
            to: email,
            subject: "OTP for Password Reset",
            html: `<h3>Hello ${name},</h3>
            <p>Your OTP for password reset is: <strong>${otp}</strong></p>
            <p>This OTP is valid for 2 minutes.</p>`
        };

        // Save OTP in the database
        const newOtp = new Otp({
            userId: userId,
            otp: otp,
            createdAt: Date.now(),
            expiresAt: Date.now() + 120000, // OTP expires after 2 minutes (120,000 milliseconds)
        });
        await newOtp.save();

        // Send email with OTP
        const info = await transporter.sendMail(mailOptions);
        console.log("Email has been sent:", info.response);

    } catch (error) {
        console.log("Error sending OTP mail:", error.message);
        throw new Error("Failed to send OTP");
    }
};

// Controller method for rendering forgot password form
const loadForgotPasswordForm = async (req, res) => {
    try {
        res.render('forgot-password');
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Controller method for handling submission of forgot password form
const sendForgotPasswordEmail = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if the user with the provided email exists
        const user = await User.findOne({ email });

        if (!user) {
            // Handle case where user does not exist
            return res.render('forgot-password', { message: 'User not found' });
        }

        // Generate OTP
        const otp = generateOTP();

        // Send OTP to user's email
        await sendOtpMail(user.name, email, otp, user._id);

        // Redirect to OTP verification page
        res.redirect(`/reset-password/${email}`);

    } catch (error) {
        console.error('Error sending forgot password email:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Controller method for rendering reset password form with OTP verification
const loadResetPasswordForm = async (req, res) => {
    try {
        const { email } = req.params;
        res.render('reset-password', { email });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};
// Controller method for handling submission of reset password form
const resetPassword = async (req, res) => {
    try {
        const { email } = req.params;
        const { otp, newPassword } = req.body;

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            // Handle case where user is not found
            return res.status(404).render('reset-password', { email, message: 'User not found' });
        }

        // Verify the OTP
        const otpRecord = await Otp.findOne({ userId: user._id, otp });

        if (!otpRecord || Date.now() > otpRecord.expiresAt) {
            // Handle invalid or expired OTP
            return res.status(400).render('reset-password', { email, message: 'Invalid or expired OTP' });
        }

        // Update user's password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        // Delete the used OTP record
        await otpRecord.deleteOne();

        // Redirect to the login page after successful password reset
        res.redirect('/login');

    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    loadForgotPasswordForm,
    sendForgotPasswordEmail,
    loadResetPasswordForm,
    resetPassword
};
