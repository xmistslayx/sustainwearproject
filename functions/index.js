const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Create Gmail transport using Firebase environment config
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.pass
  }
});


// Thank you eamil on donation 

exports.sendThankYouEmail = functions.firestore
  .document("donations/{donationId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();

    const mailOptions = {
      from: "SustainAware <no-reply@sustainaware.org>",
      to: data.email,
      subject: "Thank You For Your Donation!",
      html: `
        <h2>Hello ${data.name},</h2>
        <p>Thank you for donating to <strong>SustainAware</strong>.</p>
        <p>Your contribution helps us continue creating meaningful environmental change.</p>
        <br>
        <p>Warm regards,<br>SustainAware Team</p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Thank-you email sent to:", data.email);
    } catch (error) {
      console.error("Error sending thank-you email:", error);
    }
  });




exports.sendPickupConfirmation = functions.firestore
  .document("donations/{donationId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only send email when status changes to accepted
    if (before.status !== "accepted" && after.status === "accepted") {
      const mailOptions = {
        from: "SustainAware <no-reply@sustainaware.org>",
        to: after.email,
        subject: "Your Donation Pickup Slot Has Been Confirmed",
        html: `
          <h2>Hello ${after.name},</h2>
          <p>Your donation pickup slot has now been <strong>confirmed</strong>.</p>
          <p><strong>Date:</strong> ${after.pickupDate}<br>
          <strong>Time:</strong> ${after.pickupTime}</p>
          <br>
          <p>Thank you again for supporting SustainAware!</p>
          <p>SustainAware Team</p>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log("Pickup confirmation email sent to:", after.email);
      } catch (error) {
        console.error("Error sending pickup confirmation email:", error);
      }
    }

    return null;
  });
