const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please Provide user Name"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Please Provide Email Name"],
    trim: true,
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please Provide Valid Email Address"],
  },
  photo: {
    type: String,
    default: "default.jpg",
  },
  role: {
    type: String,
    enum: ["user", "admin", "guide", "lead-guide"],
    default: "user",
  },
  password: {
    type: String,
    required: [true, "A Password is Required"],
    trim: true,
    minlength: [8, "Password Should be 8 character Long"],
    select: false,
  },
  confirmPassword: {
    type: String,
    required: [true, "Please Confirm the Password"],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the Same",
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: { type: Boolean, default: true, select: false },
});

// userSchema.pre("save", async function (next) {
//   //Only Runs this code when password is actuallly modified
//   if (!this.isModified("password")) return next();

//   //Hash the password with cost of 12
//   this.password = await bcrypt.hash(this.password, 12);

//   //Delete Password Confirm Field
//   this.confirmPassword = undefined;
//   next();
// });

userSchema.pre(/^find/, async function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  originalPassword
) {
  return await bcrypt.compare(candidatePassword, originalPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000);
    console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp; //True means password changed
  }
  //False means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = async function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model(`User`, userSchema);

module.exports = User;
