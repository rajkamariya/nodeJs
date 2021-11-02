const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/appError");
const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const sendEmail = require("./../utils/email");
const { collection } = require("./../models/userModel");

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const sendToken = (id, status, res) => {
  const token = signToken(id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);
  // 4) Log user in, send JWT
  res.status(status).json({
    status: "success",
    token,
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    role: req.body.role,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    passwordChangedAt: req.body.passwordChangedAt,
  });

  sendToken(newUser._id, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1) Check email and password exist
  if (!email || !password) {
    return next(new AppError("Please Provide Email and Password", 400));
  }
  //2) Check if user exist and password is correct
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Email or Password is incorrect", 401));
  }

  //3) If everything is ok then send token to the clients
  sendToken(user._id, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1) Check if token exist and get token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    next(
      new AppError("You are not logged in. Please log in to get access", 401)
    );
  }
  //2)Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //3) check if user exist
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    next(
      new AppError(
        "User Does not Exist. Token is belong to the user which is not exist",
        401
      )
    );
  }
  //4) check password is chenged after token generated
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password. please login again", 401)
    );
  }

  //Grant Access of data to the User
  req.user = freshUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array [admin, lead-guide]
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You Do not have permision to perform this action", 403)
      );
    }
    next();
  };
};

exports.forgetPassword = catchAsync(async (req, res, next) => {
  //1) Get User based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with this email address"), 404);
  }
  //2) Generate the random reset token
  const resetToken = await user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3) Send it to User's Mail

  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forget your password ? Submit a patch request with your new password and passwordConfirm to: ${resetUrl}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your Password Reset Token(valid for 10 min)",
      message: message,
    });
    res.status(200).json({
      status: "success",
      message: "Token Send to Email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError("There was an Error in sending email. Try Again Later"),
      500
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get User Based on the token
  const hasToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  if (!hasToken) {
    next(new AppError("Please Provide the token"), 400);
  }
  console.log(hasToken);
  const user = await User.findOne({ passwordResetToken: hasToken });
  // 2) If token has not expired, and there is user, set the new password

  if (!user) {
    next(new AppError("can not find user with this token"), 400);
  }
  if (Date.now() > user.passwordResetExpires.getTime()) {
    next(new AppError("Your Token is Expired. Please generate new token"), 400);
  }
  if (req.body.password !== req.body.confirmPassword) {
    next(new AppError("Password and ConfirmPassword are not same", 400));
  }
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;

  // 3) Update changedPasswordAt property for the user
  user.passwordChangedAt = Date.now();
  await user.save({ validateBeforeSave: false });

  // 4) Log the User in send JWT
  sendToken(user._id, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get the user from the collection
  const user = await User.findById(req.user._id).select("+password");

  // 2) Check if Posted current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(
      new AppError("Password is Incoorect. Please enter correct password.", 401)
    );
  }
  // 3) If so, update password
  if (req.body.password !== req.body.confirmPassword) {
    return next(new AppError("Please Enter both same password", 400));
  }

  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordChangedAt = Date.now();
  await user.save({ validateBeforeSave: false });

  sendToken(user._id, 200, res);
});
