import jwt from 'jsonwebtoken';
import User from '../models/User.Model.js';

// Authentication middleware to verify JWT token
export const isAuth = async (req, res, next) => {
    try {
        // Check for token in cookies
        let token = req.cookies?.token;
        
        // If no token in cookies, check Authorization header
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }
        
        if (!token) {
            return res.status(401).json({
                message: "Authentication required",
                error: true,
                success: false,
                isAuthenticated: false
            });
        }
        
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
                _id: decoded.data._id,
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

// Admin authorization middleware
export const isAdmin = async (req, res, next) => {
    try {
        // Find the user from ID that was set by isAuth middleware
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }
        
        // Check if user has admin role
        if (user.role !== 'ADMIN') {
            return res.status(403).json({
                message: "Access denied. Admin privileges required.",
                error: true,
                success: false
            });
        }
        
        // User is admin, proceed to next middleware
        next();
    } catch (err) {
        res.status(500).json({
            message: err.message || "Server error occurred",
            error: true,
            success: false
        });
    }
};

// Employee authorization middleware
export const isEmployee = async (req, res, next) => {
    try {
        // Find the user from ID that was set by isAuth middleware
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }
        
        // Check if user has employee role
        if (user.role !== 'EMPLOYEE') {
            return res.status(403).json({
                message: "Access denied. Employee privileges required.",
                error: true,
                success: false
            });
        }
        
        // User is employee, proceed to next middleware
        next();
    } catch (err) {
        res.status(500).json({
            message: err.message || "Server error occurred",
            error: true,
            success: false
        });
    }
}; 