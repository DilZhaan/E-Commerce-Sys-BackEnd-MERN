import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'bankTransfer', 'cash_on_delivery', 'card'],
    required: true
  },
  transactionId: {
    type: String
  },
  bankTransferDetails: {
    accountName: { type: String },
    bankName: { type: String },
    transferDate: { type: Date },
    referenceNumber: { type: String }
  },
  cardDetails: {
    lastFour: { type: String },
    cardType: { type: String }
  },
  bankSlip: {
    url: { type: String },
    publicId: { type: String }
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  adminNote: {
    type: String
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Pre-save middleware to update the 'updatedAt' field
paymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Use the safe pattern for model registration
let Payment;
try {
  // Check if model is already registered
  Payment = mongoose.model('Payment');
} catch (e) {
  // Model not registered yet, so register it
  Payment = mongoose.model('Payment', paymentSchema);
}

export default Payment; 