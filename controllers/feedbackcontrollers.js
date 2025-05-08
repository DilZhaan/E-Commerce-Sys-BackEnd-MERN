import Feedback from "../models/feedback.js";
import { fileURLToPath } from 'url';
import path from 'path';
import ShopProductModel from "../models/ShopProduct.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all feedbacks for a product
const getProductFeedbacks = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate product exists
    const product = await ShopProductModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Get feedbacks with user details
    const feedbacks = await Feedback.find({ productId })
      .populate('userId', 'fName lName email proPic')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const total = await Feedback.countDocuments({ productId });
    
    res.status(200).json({ 
      feedbacks: feedbacks || [],
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)) || 1
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a specific feedback
const getFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const feedback = await Feedback.findById(id)
      .populate('userId', 'fName lName email proPic')
      .populate('productId', 'name images');
    
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    
    res.status(200).json({ feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Add a new feedback
const addFeedback = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user.id;

    // Validate product exists
    const product = await ShopProductModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user already provided feedback for this product
    const existingFeedback = await Feedback.findOne({ productId, userId });
    if (existingFeedback) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }

    // Create new feedback
    const feedback = new Feedback({
      productId,
      userId,
      rating,
      comment
    });

    await feedback.save();

    // Return the saved feedback with user details
    const populatedFeedback = await Feedback.findById(feedback._id)
      .populate('userId', 'fName lName email proPic');

    res.status(201).json({ feedback: populatedFeedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to add feedback", error: err.message });
  }
};

// Update a feedback
const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Find the feedback
    const feedback = await Feedback.findById(id);
    
    // Check if feedback exists
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    
    // Check if user is the owner of the feedback
    if (feedback.userId.toString() !== userId) {
      return res.status(403).json({ message: "You can only edit your own feedback" });
    }

    // Update the feedback
    feedback.rating = rating;
    feedback.comment = comment;
    feedback.updatedAt = Date.now();

    await feedback.save();

    // Return updated feedback with user details
    const updatedFeedback = await Feedback.findById(id)
      .populate('userId', 'fName lName email proPic');

    res.status(200).json({ feedback: updatedFeedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to update feedback", error: err.message });
  }
};

// Delete a feedback
const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the feedback
    const feedback = await Feedback.findById(id);
    
    // Check if feedback exists
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    
    // Check if user is the owner of the feedback
    if (feedback.userId.toString() !== userId) {
      return res.status(403).json({ message: "You can only delete your own feedback" });
    }

    // Delete the feedback
    await Feedback.findByIdAndDelete(id);

    res.status(200).json({ message: "Feedback deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to delete feedback", error: err.message });
  }
};

// Get user's feedbacks
const getUserFeedbacks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Get user's feedbacks with product details
    const feedbacks = await Feedback.find({ userId })
      .populate('productId', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const total = await Feedback.countDocuments({ userId });
    
    res.status(200).json({ 
      feedbacks: feedbacks || [],
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)) || 1
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get product rating summary
const getProductRatingSummary = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate product exists
    const product = await ShopProductModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get all feedbacks for the product
    const feedbacks = await Feedback.find({ productId });
    
    if (feedbacks.length === 0) {
      return res.status(200).json({
        totalRatings: 0,
        averageRating: 0,
        ratingDistribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0
        }
      });
    }

    // Calculate average rating
    const totalRatings = feedbacks.length;
    const ratingSum = feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0);
    const averageRating = ratingSum / totalRatings;

    // Calculate rating distribution
    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    feedbacks.forEach(feedback => {
      ratingDistribution[feedback.rating]++;
    });

    res.status(200).json({
      totalRatings,
      averageRating,
      ratingDistribution
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export {
  getProductFeedbacks,
  getFeedbackById,
  addFeedback,
  updateFeedback,
  deleteFeedback,
  getUserFeedbacks,
  getProductRatingSummary
}; 