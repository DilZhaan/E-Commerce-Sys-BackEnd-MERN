import express from 'express';
import { isAdmin, verifyToken } from '../middleware/auth.js';
import parseFormData from '../middleware/FormDataParser.js';
import {
  getAllShopProducts,
  searchShopProducts,
  getShopProductById,
  getInventoryForDropdown,
  addShopProduct,
  updateShopProduct,
  deleteShopProduct,
  toggleProductActive
} from '../controllers/shopProductController.js';

const router = express.Router();

// Public routes
router.get('/list', getAllShopProducts);
router.get('/search', searchShopProducts);
router.get('/detail/:id', getShopProductById);

// Protected routes - available to authenticated users
router.get('/inventory-dropdown', verifyToken, getInventoryForDropdown);

// Admin routes - only available to admin users
router.post('/add', verifyToken, isAdmin, parseFormData, addShopProduct);
router.put('/update/:id', verifyToken, isAdmin, parseFormData, updateShopProduct);
router.delete('/delete/:id', verifyToken, isAdmin, deleteShopProduct);
router.patch('/toggle-active/:id', verifyToken, isAdmin, toggleProductActive);

export default router; 