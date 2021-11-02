const mongoose = require("mongoose");
const dotenv = require("dotenv");

process.on("uncaughtException", (err) => {
  console.log(err, err.message);
  console.log("Uncaught Exception shutting Down.....");
  process.exit(1);
});

dotenv.config({ path: `./config.env` });
const app = require(`./app`);

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then((con) => {
    console.log("DB Connection Successful");
  });

const port = 3000;

const server = app.listen(port, () => {
  console.log(`App Running on Port ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.log(err, err.message);
  console.log("Unhandled Rejection ! Shutting Down");
  server.close(() => {
    process.exit(1);
  });
});
