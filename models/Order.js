import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const orderItemSchema = new Schema({
  product: { 
    type: Schema.Types.ObjectId, 
    ref: 'ShopProduct',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  }
});

const orderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  shippingAddress: {
    address: String,
    city: String,
    phone: String
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
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
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Use the safe pattern for model registration
let Order;
try {
  // Check if model is already registered
  Order = mongoose.model('Order');
} catch (e) {
  // Model not registered yet, so register it
  Order = mongoose.model('Order', orderSchema);
}

export default Order; 