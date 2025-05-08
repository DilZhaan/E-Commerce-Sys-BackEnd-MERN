import express from 'express';
import { 
  getProductFeedbacks,
  getFeedbackById,
  addFeedback,
  updateFeedback,
  deleteFeedback,
  getUserFeedbacks,
  getProductRatingSummary
} from '../controllers/feedbackcontrollers.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes (accessible by all users)
router.get("/product/:productId", getProductFeedbacks);
router.get("/rating/:productId", getProductRatingSummary);
router.get("/:id", getFeedbackById);

// Protected routes (registered users only)
router.get("/user/my-feedbacks", verifyToken, getUserFeedbacks);
router.post("/", verifyToken, addFeedback);
router.put("/:id", verifyToken, updateFeedback);
router.delete("/:id", verifyToken, deleteFeedback);

export default router; 