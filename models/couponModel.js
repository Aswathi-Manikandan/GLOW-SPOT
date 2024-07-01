const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema({
  couponName:{
    type:String,
    required:true,
    uppercase:true,
    unique : true
  },
  couponCode:{
    type:String,
    required:true,
    unique: true,
  },
  usageLimit: {
    type: Number,
    default: 1
},
usedCount: {
    type: Number,
    default: 0
},
  discountPercent:{
    type:Number,
    required:true
  },
  minAmount:{
    type:Number,
    required:true
  },
  couponDescription:{
    type:String,
    required:true
  },
  availability:{
    type:Number,
    required:true
  },
  expiryDate:{
    type:Date,
  },
  status:{
    type:Boolean,
    default:true
  },
  userUsed : [{
       user_id:{
       type : mongoose.Types.ObjectId,
       ref :'User'
       }
    }],
},{timestamps:true})

couponSchema.pre('find', async function () {
  const currentDate = new Date();
  await this.model.updateMany(
      { expiryDate: { $lt: currentDate }, status: true },
      { $set: { status: false } }
  );
});

couponSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
      next(new Error('Coupon name or code must be unique.'));
  } else {
      next(error);
  }
});


// Create indexes after defining schema
couponSchema.index({ couponName: 1 }, { unique: true });
couponSchema.index({ couponCode: 1 }, { unique: true });




module.exports = mongoose.model('Coupon',couponSchema)
