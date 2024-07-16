const mongoose =require ('mongoose');

 const userSchema =new  mongoose.Schema({
    googleId: {
        type: String,
        required: true
    },
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    mobile:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    is_admin:{
        type:String,
        required:true,
        default:0
    },

    isVerified:{
        type:Boolean,
        default:false
    },
    blocked: { 
        type: Boolean, default: false 
    },
    wallet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet',
    },
    appliedCoupons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }],


});

module.exports=mongoose.model('User',userSchema);




