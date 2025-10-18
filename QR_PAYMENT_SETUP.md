# QR Payment Setup Guide

## Overview
Your application now uses QR code payments instead of Razorpay for online transactions. Users can scan QR codes using any UPI app (Google Pay, Paytm, PhonePe, etc.) to make payments.

## Configuration Steps

### 1. Update Your UPI ID
Edit the file: `src/config/qr-payment.ts`

```typescript
export const QR_PAYMENT_CONFIG = {
  UPI_ID: "hardanas66-1@okaxis", // Replace with your actual UPI ID
  MERCHANT_NAME: "Your doctor",
  CURRENCY: "INR",
};
```

### 2. Get Your UPI ID
- **Paytm**: merchant@paytm (for Paytm Business)
- **Google Pay/PhonePe**: Usually your mobile number or business ID
- **Other UPI providers**: merchant@yourbank or specific format

### 3. Test the Payment Flow
1. Go to any doctor's booking page
2. Select "Online" consultation type
3. Choose "Pay via QR Code" option
4. Complete patient details
5. Click "Confirm Booking"
6. QR code will be displayed for payment
7. User scans QR and pays via UPI app
8. User clicks "I have paid" to complete booking

## Features
- ✅ Generates unique transaction reference numbers
- ✅ Displays QR code with payment details
- ✅ Stores payment information in appointment notes
- ✅ Works with all UPI apps
- ✅ No third-party payment gateway fees
- ✅ Secure transaction tracking

## Security Notes
- Payments are processed directly through UPI
- Transaction references are stored for tracking
- No sensitive payment data stored in your system
- Users should verify payment amounts before completing

## Support
If you need help configuring your UPI ID or have issues with QR payments, contact your payment provider for assistance.
