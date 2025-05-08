import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const shopProductSchema = new Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  inventoryItem: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Inventory',
    required: true 
  },
  salePrice: { 
    type: Number, 
    required: true 
  },
  discount: { 
    type: Number, 
    default: 0 
  },
  description: { 
    type: String, 
    required: true 
  },
  shopWarranty: { 
    type: Number, 
    required: true,
    default: 0 
  }, // in months
  images: [{ 
    type: String 
  }],
  active: {
    type: Boolean,
    default: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save middleware to update the 'updatedAt' field
shopProductSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Add text index for search functionality
shopProductSchema.index({ 
  name: 'text', 
  description: 'text'
});

let ShopProductModel;
try {
  // Check if model is already registered
  ShopProductModel = mongoose.model('ShopProduct');
} catch (e) {
  // Model not registered yet, so register it
  ShopProductModel = mongoose.model('ShopProduct', shopProductSchema);
}

export default ShopProductModel; 