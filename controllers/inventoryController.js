import Inventory from "../models/inventoryModel.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all inventory items with pagination, sorting, and filtering
export const getAllInventoryItems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    
    // Handle special case for unlimited items (for exports)
    if (limit === -1) {
      const items = await Inventory.find();
      return res.status(200).json({
        success: true,
        products: items
      });
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Build sorting object
    const sort = {};
    sort[sortBy] = sortOrder;

    // Count total documents
    const total = await Inventory.countDocuments();
    
    // Calculate total pages
    const pages = Math.ceil(total / limit);

    // Find inventory items with pagination and sorting
    const inventoryItems = await Inventory.find()
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      products: inventoryItems,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching inventory items",
      error: error.message
    });
  }
};

// Search inventory items
export const searchInventoryItems = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    
    // Calculate skip for pagination
    const skip = (page - 1) * limit;
    
    // Build sorting object
    const sort = {};
    sort[sortBy] = sortOrder;
    
    // Build search query
    let query = {};
    
    if (searchTerm) {
      // If using text indexes
      query = { $text: { $search: searchTerm } };
      
      // Alternative approach using regex for more flexible matching
      // query = {
      //   $or: [
      //     { modelName: { $regex: searchTerm, $options: "i" } },
      //     { brandName: { $regex: searchTerm, $options: "i" } },
      //     { supplierName: { $regex: searchTerm, $options: "i" } },
      //     { supplierContact: { $regex: searchTerm, $options: "i" } },
      //     { supplierAddress: { $regex: searchTerm, $options: "i" } }
      //   ]
      // };
    }
    
    // Count total matching documents
    const total = await Inventory.countDocuments(query);
    
    // Calculate total pages
    const pages = Math.ceil(total / limit);
    
    // Find matching inventory items with pagination and sorting
    const inventoryItems = await Inventory.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    return res.status(200).json({
      success: true,
      products: inventoryItems,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error("Error searching inventory items:", error);
    return res.status(500).json({
      success: false,
      message: "Error searching inventory items",
      error: error.message
    });
  }
};

// Get a specific inventory item by ID
export const getInventoryItemById = async (req, res) => {
  try {
    const inventoryItem = await Inventory.findById(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found"
      });
    }
    return res.status(200).json({
      success: true,
      product: inventoryItem
    });
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching inventory item",
      error: error.message
    });
  }
};

// Add a new inventory item
export const addInventoryItem = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    
    // Process the uploaded image if any (from express-fileupload)
    if (req.files && req.files.billImage) {
      const file = req.files.billImage;
      const filename = `bill_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const uploadPath = path.join(__dirname, '..', 'uploads', filename);
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Move the file to the uploads directory
      await file.mv(uploadPath);
      
      // Add the image path to the request body
      req.body.billImage = `uploads/${filename}`;
    } 
    // Process the uploaded image from the custom FormDataParser (req.file)
    else if (req.file && req.file.fieldname === 'billImage') {
      const filename = `bill_${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
      const uploadPath = path.join(__dirname, '..', 'uploads', filename);
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Write the file buffer to the uploads directory
      fs.writeFileSync(uploadPath, req.file.buffer);
      
      // Add the image path to the request body
      req.body.billImage = `uploads/${filename}`;
    }
    
    // Ensure all required fields are present and have the correct type
    if (req.body.purchasedPrice) {
      req.body.purchasedPrice = Number(req.body.purchasedPrice);
    }
    
    if (req.body.warranty) {
      req.body.warranty = Number(req.body.warranty);
    }
    
    if (req.body.quantity) {
      req.body.quantity = Number(req.body.quantity);
    }
    
    if (req.body.reorderLevel) {
      req.body.reorderLevel = Number(req.body.reorderLevel);
    }
    
    // Create the new inventory item
    const newInventoryItem = new Inventory(req.body);
    const savedItem = await newInventoryItem.save();
    
    return res.status(201).json({
      success: true,
      message: "Inventory item added successfully",
      product: savedItem
    });
  } catch (error) {
    console.error("Error adding inventory item:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding inventory item",
      error: error.message
    });
  }
};

// Update an existing inventory item
export const updateInventoryItem = async (req, res) => {
  try {
    console.log("Update request body:", req.body);
    
    // Find the inventory item to update
    const inventoryItem = await Inventory.findById(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found"
      });
    }
    
    // Process the uploaded image if any (from express-fileupload)
    if (req.files && req.files.billImage) {
      const file = req.files.billImage;
      const filename = `bill_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const uploadPath = path.join(__dirname, '..', 'uploads', filename);
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Move the file to the uploads directory
      await file.mv(uploadPath);
      
      // Delete the old image if it exists and replaceBillImage is true
      if (inventoryItem.billImage && req.body.replaceBillImage === 'true') {
        const oldImagePath = path.join(__dirname, '..', inventoryItem.billImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      // Add the new image path to the request body
      req.body.billImage = `uploads/${filename}`;
    } 
    // Process the uploaded image from the custom FormDataParser (req.file)
    else if (req.file && req.file.fieldname === 'billImage') {
      const filename = `bill_${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
      const uploadPath = path.join(__dirname, '..', 'uploads', filename);
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Write the file buffer to the uploads directory
      fs.writeFileSync(uploadPath, req.file.buffer);
      
      // Delete the old image if it exists and replaceBillImage is true
      if (inventoryItem.billImage && req.body.replaceBillImage === 'true') {
        const oldImagePath = path.join(__dirname, '..', inventoryItem.billImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      // Add the new image path to the request body
      req.body.billImage = `uploads/${filename}`;
    } else if (req.body.replaceBillImage === 'true' && !req.files && !req.file) {
      // If replaceBillImage is true but no new image is provided, remove the image
      if (inventoryItem.billImage) {
        const oldImagePath = path.join(__dirname, '..', inventoryItem.billImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
        req.body.billImage = null;
      }
    }
    
    // Ensure all numeric fields have the correct type
    if (req.body.purchasedPrice) {
      req.body.purchasedPrice = Number(req.body.purchasedPrice);
    }
    
    if (req.body.warranty) {
      req.body.warranty = Number(req.body.warranty);
    }
    
    if (req.body.quantity) {
      req.body.quantity = Number(req.body.quantity);
    }
    
    if (req.body.reorderLevel) {
      req.body.reorderLevel = Number(req.body.reorderLevel);
    }
    
    // Update the inventory item
    const updatedItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true } // Return the updated document
    );
    
    return res.status(200).json({
      success: true,
      message: "Inventory item updated successfully",
      product: updatedItem
    });
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating inventory item",
      error: error.message
    });
  }
};

// Delete an inventory item
export const deleteInventoryItem = async (req, res) => {
  try {
    // Find the inventory item to delete
    const inventoryItem = await Inventory.findById(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found"
      });
    }
    
    // Delete the associated image if it exists
    if (inventoryItem.billImage) {
      const imagePath = path.join(__dirname, '..', inventoryItem.billImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Delete the inventory item
    await Inventory.findByIdAndDelete(req.params.id);
    
    return res.status(200).json({
      success: true,
      message: "Inventory item deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting inventory item",
      error: error.message
    });
  }
};

// Export all inventory items
export const exportInventoryItems = async (req, res) => {
  try {
    // Get all inventory items
    const inventoryItems = await Inventory.find();
    
    return res.status(200).json({
      success: true,
      products: inventoryItems
    });
  } catch (error) {
    console.error("Error exporting inventory items:", error);
    return res.status(500).json({
      success: false,
      message: "Error exporting inventory items",
      error: error.message
    });
  }
}; 