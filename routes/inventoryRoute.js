import express from 'express';
import { 
  getAllInventoryItems, 
  addInventoryItem, 
  getInventoryItemById, 
  updateInventoryItem, 
  deleteInventoryItem, 
  searchInventoryItems,
  exportInventoryItems 
} from '../controllers/inventoryController.js';
import { isAdmin } from '../middleware/auth.js';
import parseFormData from '../middleware/FormDataParser.js';

const router = express.Router();

// Public routes (accessible by all authenticated users)
router.get("/", getAllInventoryItems);
router.get("/search", searchInventoryItems);
router.get("/:id", getInventoryItemById);

// Protected routes (admin only)
router.get("/export/all", isAdmin, exportInventoryItems);
router.post("/", isAdmin, parseFormData, addInventoryItem);
router.put("/:id", isAdmin, parseFormData, updateInventoryItem);
router.delete("/:id", isAdmin, deleteInventoryItem);

export default router; 