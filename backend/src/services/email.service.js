const nodemailer = require('nodemailer');

let transporter = null;


const initTransporter = async () => {
  if (transporter) return;
  
  
  
  const testAccount = await nodemailer.createTestAccount();
  
  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, 
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  
  console.log('Ethereal Email initialized for development testing.');
};

const sendBookingConfirmation = async (userEmail, event, bookingSeats) => {
  try {
    await initTransporter();
    
    const seatNumbers = bookingSeats.map(bs => bs.seatNumber).join(', ');
    
    const info = await transporter.sendMail({
      from: '"Event Booking System" <no-reply@eventbooking.local>',
      to: userEmail,
      subject: `Booking Confirmed: ${event.name}`,
      text: `Hello!\n\nYour booking for ${event.name} has been confirmed.\n\nDate: ${new Date(event.date).toLocaleDateString()}\nTime: ${event.time}\nLocation: ${event.location}\nSeats: ${seatNumbers}\n\nThank you for booking with us!`,
      html: `
        <h2>Booking Confirmation</h2>
        <p>Hello!</p>
        <p>Your booking for <strong>${event.name}</strong> has been confirmed.</p>
        <ul>
          <li><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</li>
          <li><strong>Time:</strong> ${event.time}</li>
          <li><strong>Location:</strong> ${event.location}</li>
          <li><strong>Seats:</strong> ${seatNumbers}</li>
        </ul>
        <p>Thank you for booking with us!</p>
      `
    });

    console.log("Confirmation email sent! Message ID: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.error("Failed to send email confirmation:", error);
  }
};

const sendCancellationNotice = async (userEmail, event, bookingSeats) => {
  try {
    await initTransporter();
    
    const seatNumbers = bookingSeats.map(bs => bs.seatNumber).join(', ');
    
    const info = await transporter.sendMail({
      from: '"Event Booking System" <no-reply@eventbooking.local>',
      to: userEmail,
      subject: `Booking Cancelled: ${event.name}`,
      text: `Hello,\n\nYour booking for ${event.name} has been cancelled.\n\nSeats cancelled: ${seatNumbers}\n\nWe hope to see you another time!`,
      html: `
        <h2>Booking Cancelled</h2>
        <p>Hello,</p>
        <p>Your booking for <strong>${event.name}</strong> has been cancelled.</p>
        <p><strong>Seats cancelled:</strong> ${seatNumbers}</p>
        <p>We hope to see you another time!</p>
      `
    });

    console.log("Cancellation email sent! Message ID: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.error("Failed to send email cancellation:", error);
  }
};

module.exports = {
  sendBookingConfirmation,
  sendCancellationNotice
};
