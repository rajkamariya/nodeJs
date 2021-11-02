const mongoose = require("mongoose");
const validator = require("validator");
// const User = require("./userModel");

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A tour must have a name"],
      unique: true,
      minLength: [10, "Name must have 10 characters"],
      maxLength: [40, "Name shoul be less than 40 character"],
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, "A tour must have a durations"],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A tour must have a Group Size"],
    },
    difficulty: {
      type: String,
      required: [true, "A tour must have a difficulty"],
    },
    ratingAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1"],
      max: [5, "Rating must be below 5"],
      set: (val) => {
        Math.round(val * 10) / 10;
      },
    },
    ratingsQuantity: { type: Number, default: 0 },
    price: { type: Number, required: [true, "A tour must have a price"] },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return val < this.price;
        },
        message: "Discount Price should be below Price",
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, "A Tour must have summary"],
    },
    description: { type: String, trim: true },
    imageCover: {
      type: String,
      trim: true,
      required: [true, "A Tour must have Image"],
    },
    images: [String],
    createdAt: { type: Date, default: Date.now() },
    startDates: [Date],
    startLocation: {
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

tourSchema.index({ price: 1, ratingAverage: -1 });
tourSchema.index({ startLocation: "2dsphere" });
tourSchema.virtual("durationWeeks").get(function () {
  return this.duration / 7;
});

//Virtual Populates

tourSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "tour",
  localField: "_id",
});

//Document Middleware will be executed before the save() and create() command executed.
// tourSchema.pre("save", function (next) {
//   console.log("It will executed before save command run");
//   next();
// });

// tourSchema.pre("save", async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   console.log(guidesPromises);
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

//Query Middleware will be executed wheneve find() command executed
tourSchema.pre(/^find/, function (next) {
  console.log("Before Find() is called");
  next();
});
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: "guides",
    select: "-__v -passwordChangedAt",
  });
  next();
});
const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;
