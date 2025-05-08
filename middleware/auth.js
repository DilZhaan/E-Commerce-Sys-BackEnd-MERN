import jwt from 'jsonwebtoken';
import User from '../models/User.Model.js';

// Verify JWT token
const verifyToken = (req, res, next) => {
  try {
    const token = req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({
        message: "Authentication required",
        error: true,
        success: false,
        isAuthenticated: false
      });
    }
    
    // Verify token
    jwt.verify(token, process.env.TOKEN_SECRET_KEY, (err, decoded) => {
      if (err) {
        console.error("Token verification error:", err);
        return res.status(401).json({
          message: "Authentication failed",
          error: true,
          success: false,
          isAuthenticated: false
        });
      }
      
      // Set user data from token
      req.user = {
        id: decoded.data._id,
        email: decoded.data.email,
        role: decoded.data.role
      };
      
      next();
    });
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({
      message: "Authentication failed",
      error: true,
      success: false,
      isAuthenticated: false
    });
  }
};

// Check if user is an admin
const isAdmin = async (req, res, next) => {
  try {
    // First verify the token
    verifyToken(req, res, async () => {
      // Find the user from ID
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          message: "User not found",
          error: true,
          success: false
        });
      }
      
      // Check if user has admin role
      if (user.role.toUpperCase() !== 'ADMIN') {
        return res.status(403).json({
          message: "Access denied. Admin privileges required.",
          error: true,
          success: false
        });
      }
      
      // User is admin, proceed to next middleware
      next();
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error occurred",
      error: true,
      success: false
    });
  }
};

export { verifyToken, isAdmin }; 