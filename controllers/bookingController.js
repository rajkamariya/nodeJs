const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Tour = require("./../models/tourModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const factory = require(`./handlerFactory`);

exports.getCheckoutSession = catchAsync(async(req,res,next)=>{
    //1)Get The Currently Booked Tour
    const tour = await Tour.findById(req.params.tourId);
    //2) Create Checkout Session
    const session = await stripe.checkout.sessions.create({
        payment_method_types:['card'],
        success_url:`${req.protocol}://${req.get('host')}`,
        cancel_url:`${req.protocol}://${req.get('host')}/tour`,
        customer_email:req.user.email,
        client_reference_id:req.params.tourId,
        line_items:[
            {
                name:`${tour.name} Tour`,
                description:tour.summary,
                images:[`${tour.imageCover}`],
                amount:tour.price*100,  
                currency: 'usd',
                quantity:1
            }
        ]
    })
    //3) Create sessio as response
    res.status(200).json({
        status:"success",
        session
    })
})