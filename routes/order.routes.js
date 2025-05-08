import express from 'express';
import { 
  createOrder, 
  getAllOrders, 
  getUserOrders, 
  getOrderById, 
  updateOrderStatus, 
  updateOrderPaymentStatus,
  cancelOrder,
  clearCancelledOrders,
  clearAllCancelledOrders
} from '../controllers/orderController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create a new order
router.post('/', createOrder);

// Get user orders
router.get('/my-orders', getUserOrders);

// Clear cancelled orders for current user
router.delete('/clear-cancelled', clearCancelledOrders);

// Clear all cancelled orders - admin only
router.delete('/admin/clear-cancelled', adminMiddleware, clearAllCancelledOrders);

// Admin routes
// Get all orders - admin only
router.get('/', adminMiddleware, getAllOrders);

// Update order status - admin only
router.put('/:id/status', adminMiddleware, updateOrderStatus);

// Get order by ID
router.get('/:id', getOrderById);

// Update order payment status
router.put('/:id/payment-status', updateOrderPaymentStatus);

// Cancel an order
router.delete('/:id', cancelOrder);

export default router; 