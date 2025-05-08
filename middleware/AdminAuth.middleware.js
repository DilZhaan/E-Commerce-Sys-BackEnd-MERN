import userModel from "../models/User.Model.js";

const adminAuth = async (req, res, next) => {
    try {
        // Find the user from ID that was set by authToken middleware
        const user = await userModel.findById(req.user.id);
        
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
    } catch (err) {
        res.status(500).json({
            message: err.message || "Server error occurred",
            error: true,
            success: false
        });
    }
};

export default adminAuth; 