import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const cartItemSchema = new Schema({
  product: { 
    type: Schema.Types.ObjectId, 
    ref: 'ShopProduct',
    required: true
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true
  }
});

const cartSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [cartItemSchema],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Calculate total price of cart
cartSchema.virtual('totalPrice').get(function() {
  return this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
});

// Pre-save middleware to update the 'updatedAt' field
cartSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);

export default Cart; 