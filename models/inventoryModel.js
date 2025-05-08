import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const inventorySchema = new Schema({
  modelName: { type: String, required: true },
  purchasedPrice: { type: Number, required: true },
  warranty: { type: Number, required: true }, // in months
  quantity: { type: Number, required: true, default: 0 },
  reorderLevel: { type: Number, required: true, default: 5 },
  brandName: { type: String, required: true },
  supplierName: { type: String, required: true },
  supplierContact: { type: String, required: true },
  supplierAddress: { type: String, required: true },
  billImage: { type: String }, // path to the image file
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save middleware to update the 'updatedAt' field
inventorySchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Add text index for search functionality
inventorySchema.index({ 
  modelName: 'text', 
  brandName: 'text', 
  supplierName: 'text', 
  supplierAddress: 'text'
});

const InventoryModel = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);

export default InventoryModel; 