import express from 'express';
import { 
  createPayment, 
  getAllPayments, 
  getUserPayments, 
  getPaymentById, 
  updatePaymentStatus, 
  deletePayment,
  processCardPaymentEndpoint,
  generateReceipt
} from '../controllers/paymentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import { handleUpload } from '../middleware/FileUpload.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Make a payment - with file upload support
router.post('/', handleUpload('bankSlip'), createPayment);

// Process card payment 
router.post('/card', processCardPaymentEndpoint);

// Get user payments
router.get('/my-payments', getUserPayments);

// Generate and download e-receipt
router.get('/:id/receipt', generateReceipt);

// Get payment by ID
router.get('/:id', getPaymentById);

// Admin routes
// Get all payments - admin only
router.get('/', adminMiddleware, getAllPayments);

// Update payment status - admin only
router.put('/:id/status', adminMiddleware, updatePaymentStatus);

// Delete payment record - admin only
router.delete('/:id', adminMiddleware, deletePayment);

export default router; 