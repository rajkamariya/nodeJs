const nodemailer = require("nodemailer");

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `Raj Kamariya <${process.env.EMAIL_FROM}>`;
  }

  createTransport() {
    if (process.env.NODE_ENV === "production") {
      return 1;
    }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  send(template,subject){

  }

  sendWelcom(){
    this.send('welcome',)
  }
};

const sendEmail = async (options) => {
  //Activate in gmail "less secure app" option

  //2) Define the email options
  const mailOptions = {
    from: "Jonas Schmedtmann <hello@raj.io>",
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html:
  };
  //3) Send the email with node mailer
  await transporter.sendMail(mailOptions);
};

