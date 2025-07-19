import ShopProduct from "../models/ShopProduct.js";
import Inventory from "../models/inventoryModel.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all products with pagination, sorting, and filtering
export const getAllShopProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    
    // Handle special case for unlimited items (for exports)
    if (limit === -1) {
      const items = await ShopProduct.find()
        .populate('inventoryItem', 'modelName brandName warranty quantity reorderLevel');
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

    // Build filter query
    const filter = {};
    
    // Optional active filter
    if (req.query.active) {
      filter.active = req.query.active === 'true';
    }

    // Count total documents
    const total = await ShopProduct.countDocuments(filter);
    
    // Calculate total pages
    const pages = Math.ceil(total / limit);

    // Find products with pagination and sorting
    const products = await ShopProduct.find(filter)
      .populate('inventoryItem', 'modelName brandName warranty quantity reorderLevel')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error("Error fetching shop products:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching shop products",
      error: error.message
    });
  }
};

// Search products
export const searchShopProducts = async (req, res) => {
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
      query = { $text: { $search: searchTerm } };
    }
    
    // Add active filter if specified
    if (req.query.active !== undefined) {
      query.active = req.query.active === 'true';
    }
    
    // Count total matching documents
    const total = await ShopProduct.countDocuments(query);
    
    // Calculate total pages
    const pages = Math.ceil(total / limit);
    
    // Find matching products with pagination and sorting
    const products = await ShopProduct.find(query)
      .populate('inventoryItem', 'modelName brandName warranty quantity reorderLevel')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    return res.status(200).json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error("Error searching shop products:", error);
    return res.status(500).json({
      success: false,
      message: "Error searching shop products",
      error: error.message
    });
  }
};

// Get a specific product by ID
export const getShopProductById = async (req, res) => {
  try {
    const product = await ShopProduct.findById(req.params.id)
      .populate('inventoryItem', 'modelName brandName warranty quantity reorderLevel supplierName purchasedPrice');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error("Error fetching shop product:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching shop product",
      error: error.message
    });
  }
};

// Get all inventory items for dropdown selection
export const getInventoryForDropdown = async (req, res) => {
  try {
    const inventoryItems = await Inventory.find().select('_id modelName brandName quantity');
    
    return res.status(200).json({
      success: true,
      inventoryItems
    });
  } catch (error) {
    console.error("Error fetching inventory items for dropdown:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching inventory items",
      error: error.message
    });
  }
};

// Process uploaded images and return array of Cloudinary URLs and public IDs
const processImages = async (files) => {
    const imageResults = [];
    
    if (!files || files.length === 0) {
        return imageResults;
    }
    
    for (const file of files) {
        try {
            const result = await uploadToCloudinary(file.buffer || file.data, 'shop_products');
            imageResults.push({
                url: result.url,
                public_id: result.public_id
            });
        } catch (error) {
            console.error('Error uploading image to Cloudinary:', error);
            throw error;
        }
    }
    
    return imageResults;
};

// Add a new shop product
export const addShopProduct = async (req, res) => {
    try {
        console.log("Adding new shop product");
        console.log("Request body:", req.body);
        
        let files = [];
        
        // Handle files from different middlewares
        if (req.files?.images) {
            files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        } else if (req.files && Array.isArray(req.files)) {
            files = req.files;
        } else if (req.file) {
            files = [req.file];
        }
        
        // Upload images to Cloudinary
        const imageResults = await processImages(files);
        
        // Create new product with Cloudinary URLs
        const newProduct = new ShopProduct({
            ...req.body,
            images: imageResults
        });
        
        const savedProduct = await newProduct.save();
        console.log("Product saved successfully:", savedProduct);
        
        res.status(201).json({
            message: "Product added successfully",
            product: savedProduct,
            success: true
        });
    } catch (error) {
        console.error("Error adding shop product:", error);
        res.status(500).json({
            message: error.message || "Error adding shop product",
            error: true,
            success: false
        });
    }
};

// Update an existing shop product
export const updateShopProduct = async (req, res) => {
  try {
    console.log("Update shop product request:", {
      body: req.body,
      hasFiles: !!req.files,
      filesKeys: req.files ? Object.keys(req.files) : [],
      filesContents: req.files ? Object.entries(req.files).map(([key, value]) => ({
        key,
        isArray: Array.isArray(value),
        count: Array.isArray(value) ? value.length : 1,
        fileNames: Array.isArray(value) ? value.map(f => f.name || f.originalname || "unknown") : [value.name || value.originalname || "unknown"]
      })) : []
    });
    
    // SPECIAL HANDLING: If req.files is not working as expected, try to extract directly from req
    if ((!req.files || Object.keys(req.files).length === 0) && req.rawFiles) {
      console.log("No files in req.files, but found req.rawFiles:", Object.keys(req.rawFiles));
      req.files = req.rawFiles;
    }
    
    // Find the product to update
    const product = await ShopProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Shop product not found"
      });
    }
    
    // Verify the inventory item exists if it's being changed
    if (req.body.inventoryItem && req.body.inventoryItem !== product.inventoryItem.toString()) {
      const inventoryItem = await Inventory.findById(req.body.inventoryItem);
      if (!inventoryItem) {
        return res.status(404).json({
          success: false,
          message: "Referenced inventory item not found"
        });
      }
    }
    
    // Get all files from the request using our comprehensive helper function
    const allRequestFiles = getAllRequestFiles(req);
    
    // Check if there are any files in the request
    const hasFiles = (req.files && Object.keys(req.files).length > 0) || allRequestFiles.length > 0;
    
    // Process uploaded images if any
    if (hasFiles) {
      try {
        console.log("Files detected in request with keys:", req.files ? Object.keys(req.files) : 'none');
        
        // Try to log the structure of the first file for debugging (omitting binary data)
        const sampleFile = allRequestFiles[0] || (req.files && Object.values(req.files)[0]);
        if (sampleFile) {
          const fileStructure = {};
          for (const key in sampleFile) {
            if (key === 'data' || key === 'buffer') {
              fileStructure[key] = '[binary data]';
            } else {
              fileStructure[key] = sampleFile[key];
            }
          }
          console.log("Sample file structure:", JSON.stringify(fileStructure, null, 2));
        }
        
        // First try with the files we found directly
        let allFiles = [];
        if (allRequestFiles.length > 0) {
          console.log(`Using ${allRequestFiles.length} files found directly in request`);
          // Deduplicate files by checking for identical names
          const fileNames = new Set();
          allRequestFiles.forEach(file => {
            const fileName = file.name || file.originalname || file.filename;
            if (fileName && !fileNames.has(fileName)) {
              fileNames.add(fileName);
              allFiles.push(file);
            } else {
              console.log(`Skipping duplicate file: ${fileName}`);
            }
          });
          console.log(`After deduplication: ${allFiles.length} unique files`);
        } else {
          // Fall back to extracting from req.files if direct extraction didn't work
          console.log("Falling back to extracting from req.files");
          const extractedFiles = extractFilesFromCustomParser(req.files);
          
          // Deduplicate extracted files
          const fileNames = new Set();
          extractedFiles.forEach(file => {
            const fileName = file.name || file.originalname || file.filename;
            if (fileName && !fileNames.has(fileName)) {
              fileNames.add(fileName);
              allFiles.push(file);
            } else {
              console.log(`Skipping duplicate extracted file: ${fileName}`);
            }
          });
          console.log(`After extraction and deduplication: ${allFiles.length} unique files`);
        }
        
        console.log(`Total unique files to process: ${allFiles.length}`);
        
        if (allFiles.length === 0) {
          console.log("No valid files found in request");
          // Continue with product update without changing images
        } else {
          console.log("Processing images update. replaceImages:", req.body.replaceImages);
          console.log("Current images:", product.images);
          console.log("New images count:", allFiles.length);
          
          // Create uploads directory if it doesn't exist
          const uploadsDir = path.resolve(path.join(__dirname, '..', 'uploads', 'products'));
          console.log("Upload directory path:", uploadsDir);
          
          if (!fs.existsSync(uploadsDir)) {
            console.log("Upload directory doesn't exist, creating it");
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          // Check if we should replace existing images
          if (req.body.replaceImages === 'true' || req.body.replaceImages === true) {
            console.log("Replacing existing images");
            // Delete existing images
            for (const imagePath of product.images) {
              try {
                const fullPath = path.resolve(path.join(__dirname, '..', imagePath));
                console.log("Attempting to delete image at:", fullPath);
                if (fs.existsSync(fullPath)) {
                  fs.unlinkSync(fullPath);
                  console.log("Deleted image:", imagePath);
                } else {
                  console.log("Image file doesn't exist:", fullPath);
                }
              } catch (error) {
                console.error("Error deleting image:", imagePath, error);
                // Continue with other images even if one fails
              }
            }
            
            // Reset images array
            product.images = [];
          }
          
          // Track successfully processed files to avoid duplicates
          const processedFiles = new Set();
          
          // Process each new image
          for (const image of allFiles) {
            try {
              // Ensure image has a name property
              const imageName = image.name || image.originalname || image.filename || `file_${Date.now()}`;
              
              // Skip if we've already processed this file (based on name)
              if (processedFiles.has(imageName)) {
                console.log(`Skipping already processed file: ${imageName}`);
                continue;
              }
              
              const safeFilename = imageName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
              const filename = `product_${Date.now()}_${safeFilename}`;
              const uploadPath = path.resolve(path.join(uploadsDir, filename));
              console.log("Uploading image to:", uploadPath);
              
              // Ensure the file has data
              const hasData = image.data && image.data.length > 0;
              const hasBuffer = image.buffer && image.buffer.length > 0;
              const hasSize = image.size && image.size > 0;
              
              if (!hasData && !hasBuffer && !hasSize) {
                console.error("Image has no data, skipping:", imageName);
                continue;
              }
              
              // Try different methods to save the file
              let saveSuccessful = false;
              
              // Method 1: Use move method if available
              if (typeof image.mv === 'function') {
                try {
                  await image.mv(uploadPath);
                  console.log("Image moved successfully using mv()");
                  saveSuccessful = true;
                } catch (moveError) {
                  console.error("Error moving file with mv():", moveError);
                }
              }
              
              // Method 2: Use data property if available and Method 1 failed
              if (!saveSuccessful && image.data) {
                try {
                  fs.writeFileSync(uploadPath, image.data);
                  console.log("Image saved successfully using writeFileSync with image.data");
                  saveSuccessful = true;
                } catch (writeError) {
                  console.error("Error writing file with data property:", writeError);
                }
              }
              
              // Method 3: Use buffer property if available and previous methods failed
              if (!saveSuccessful && image.buffer) {
                try {
                  fs.writeFileSync(uploadPath, image.buffer);
                  console.log("Image saved successfully using writeFileSync with image.buffer");
                  saveSuccessful = true;
                } catch (writeError) {
                  console.error("Error writing file with buffer property:", writeError);
                }
              }
              
              // Verify the file was saved
              if (saveSuccessful || fs.existsSync(uploadPath)) {
                // Check file size to ensure it was actually written
                const stats = fs.statSync(uploadPath);
                console.log(`Verified file ${filename} created with size: ${stats.size} bytes`);
                
                // Only add to product images if the file was created successfully and has content
                if (stats.size > 0) {
                  const relativePath = `uploads/products/${filename}`;
                  product.images.push(relativePath);
                  console.log("Added to product images:", relativePath);
                  
                  // Mark this file as processed
                  processedFiles.add(imageName);
                } else {
                  console.error("File was created but has zero size:", uploadPath);
                  try {
                    // Remove empty file
                    fs.unlinkSync(uploadPath);
                  } catch (error) {
                    console.error("Error removing empty file:", error);
                  }
                }
              } else {
                console.error("Failed to save image:", imageName);
              }
            } catch (error) {
              console.error("Error processing image:", image.name || image.originalname || "unknown", error);
              // Continue with other images even if one fails
            }
          }
          
          console.log("Final product images array:", product.images);
        }
      } catch (error) {
        console.error("Error in image processing block:", error);
        // Continue with product update even if image processing fails
      }
    } else {
      console.log("No files found in the request");
    }
    
    // Update the product with new data
    const updateData = {
      ...req.body,
      images: product.images,
      updatedAt: Date.now()
    };
    
    console.log("Final update data:", {...updateData, images: updateData.images.length + " images"});
    
    const updatedProduct = await ShopProduct.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).populate('inventoryItem', 'modelName brandName warranty quantity reorderLevel');
    
    return res.status(200).json({
      success: true,
      message: "Shop product updated successfully",
      product: updatedProduct
    });
  } catch (error) {
    console.error("Error updating shop product:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating shop product",
      error: error.message
    });
  }
};

// Extract file objects from all possible locations in the request
const getAllRequestFiles = (req) => {
  const files = [];
  
  // Check all possible locations where files might be stored
  const possibleFileLocations = [
    req.files,         // Express-fileupload
    req.file,          // Multer (single file)
    req.rawFiles,      // Custom middleware
    req.files?.file,   // Nested in files.file
    req.files?.images, // Nested in files.images
  ];
  
  // Direct examination of the req object for debugging
  console.log("Request object keys:", Object.keys(req));
  if (req.body) console.log("Body keys:", Object.keys(req.body));
  if (req.files) console.log("Files keys:", Object.keys(req.files));
  
  // Check each possible location for files
  for (const location of possibleFileLocations) {
    if (!location) continue;
    
    if (Array.isArray(location)) {
      console.log(`Found array of files with ${location.length} items`);
      files.push(...location);
    } else if (typeof location === 'object' && !Array.isArray(location)) {
      console.log(`Found file object: ${location.name || location.originalname || 'unknown'}`);
      files.push(location);
    }
  }
  
  // Check for files directly in req
  if (req[0] && (req[0].fieldname || req[0].originalname)) {
    console.log("Found files directly in req array");
    files.push(...req);
  }
  
  // Special handling for numeric keys in files object
  if (req.files) {
    for (const key in req.files) {
      if (!isNaN(key) && req.files[key]) {
        console.log(`Found file at numeric key ${key}`);
        files.push(req.files[key]);
      }
    }
  }
  
  console.log(`Found ${files.length} files across all req locations`);
  return files;
};

// Delete a shop product
export const deleteShopProduct = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get product to delete
        const product = await ShopProduct.findById(id);
        if (!product) {
            return res.status(404).json({
                message: "Product not found",
                error: true,
                success: false
            });
        }
        
        // Delete images from Cloudinary
        for (const image of product.images) {
            if (image.public_id) {
                try {
                    await deleteFromCloudinary(image.public_id);
                } catch (error) {
                    console.error('Error deleting image from Cloudinary:', error);
                }
            }
        }
        
        // Delete product from database
        await ShopProduct.findByIdAndDelete(id);
        
        res.json({
            message: "Product deleted successfully",
            success: true
        });
    } catch (error) {
        console.error("Error deleting shop product:", error);
        res.status(500).json({
            message: error.message || "Error deleting shop product",
            error: true,
            success: false
        });
    }
};

// Toggle product active status
export const toggleProductActive = async (req, res) => {
  try {
    const product = await ShopProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Shop product not found"
      });
    }
    
    // Toggle the active status
    product.active = !product.active;
    await product.save();
    
    return res.status(200).json({
      success: true,
      message: `Product ${product.active ? 'activated' : 'deactivated'} successfully`,
      active: product.active
    });
  } catch (error) {
    console.error("Error toggling product status:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating product status",
      error: error.message
    });
  }
}; 