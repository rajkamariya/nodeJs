const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");

const AppError = require(`./utils/appError`);
const globalErrorHandler = require(`./controllers/errorController`);
const tourRouter = require(`./routes/tourRoutes`);
const userRouter = require(`./routes/userRoutes`);
const reviewRouter = require(`./routes/reviewRoutes`);
const bookingRouter = require(`./routes/bookingRoutes`)

const app = express();

//GLOBAL MIDDLEWARES

// Set security http headers
app.use(helmet());

//Development Loging Middleware
if (process.env.NODE_ENV == "development") {
  app.use(morgan("dev"));
}
//Request Limter for specific IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too Many requests from this IP,try agin in an Hour!",
});
app.use("/api", limiter);

//Body Parser it will parse Body
app.use(express.json());

//Data Sanitize against NoSql Query Injection
app.use(mongoSanitize());

//Data Sanitize against XSS
app.use(xss());

//Prevent Parameter pollution
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingAverage",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  })
);
//Test Middleware
app.use((req, res, next) => {
  console.log("Hello From the midleware");
  next();
});

// app.get("/api/v1/tours", getAllTours);
// app.get("/api/v1/tours/:id", getTour);
// app.post("/api/v1/tours", createTour);
// app.patch("/api/v1/tours/:id", updateTour);
// app.delete("/api/v1/tours/:id", deleteTour);

app.use(`/api/v1/tours`, tourRouter);
app.use(`/api/v1/users`, userRouter);
app.use(`/api/v1/review`, reviewRouter);
app.use(`/api/v1/booking`,bookingRouter)

app.all(`*`, (req, res, next) => {
  // res.status(404).json({
  //   status: "Fail",
  //   message: `Can't Find ${req.originalUrl} on this Server!`,
  // // });
  // const err = new Error(`Can't Find ${req.originalUrl} on this Server!`);
  // err.statusCode = 404;
  // err.status = "Fail";
  next(new AppError(`Can't Find ${req.originalUrl} on this Server!`, 404));
});

app.use(globalErrorHandler);
module.exports = app;
