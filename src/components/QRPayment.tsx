import { QrPaymentResponse } from "@/utils/payment";
import { Button } from "@/components/ui/button";

interface QRPaymentProps {
  paymentDetails: QrPaymentResponse;
  onPaymentComplete: () => void;
  onCancel: () => void;
}

export default function QRPayment({ paymentDetails, onPaymentComplete, onCancel }: QRPaymentProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium">Scan QR to Pay</h3>
        <p className="text-muted-foreground text-sm">
          Amount: ₹{paymentDetails.amount}
        </p>
      </div>
      
      <div className="flex justify-center">
        <img 
          src={paymentDetails.qrCodeUrl} 
          alt="Payment QR Code"
          className="w-64 h-64 border rounded-lg"
        />
      </div>
      
      <div className="text-center text-sm text-muted-foreground">
        <p>UPI ID: {paymentDetails.upiId}</p>
        <p>Reference: {paymentDetails.referenceNumber}</p>
      </div>
      
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button 
          onClick={onPaymentComplete}
          className="flex-1"
        >
          I have paid
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground text-center">
        After payment, click "I have paid" to complete your booking
      </p>
    </div>
  );
}