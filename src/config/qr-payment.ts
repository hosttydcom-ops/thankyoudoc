// QR Payment Configuration
// Update these settings with your actual payment details

export const QR_PAYMENT_CONFIG = {
  // Replace with your actual UPI ID (e.g., merchant@paytm, merchant@upi)
  UPI_ID: "hardanas66-1@okaxis",

  // Your business/merchant name
  MERCHANT_NAME: "ThankYouDoc",

  // Currency (usually INR for India)
  CURRENCY: "INR",

  // Optional: Add your business logo URL
  // LOGO_URL: "/your-logo.png"
};

// Instructions:
// 1. Update UPI_ID with your actual UPI ID from your payment provider
// 2. Update MERCHANT_NAME if needed
// 3. The QR code will be generated automatically when users make payments
// 4. Users can scan the QR with any UPI app (Google Pay, Paytm, PhonePe, etc.)

export default QR_PAYMENT_CONFIG;
