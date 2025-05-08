import userModel from "../models/User.Model.js";
import bcrypt from 'bcryptjs';
import uploadFile from '../utils/fileUpload.js';

// Get current user's profile (for any authenticated user)
const getUserProfile = async (req, res) => {
    try {
        const user = await userModel.findById(req.user.id).select("-pwd");

        res.status(200).json({
            data: user,
            error: false,
            success: true
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
};

// Update current user's profile
const updateUserProfile = async (req, res) => {
    try {
        const { fName, lName, address, city, phone, dob, gender, email } = req.body;
        const userId = req.user.id;

        // Prepare update object
        const updateData = {};
        if (fName) updateData.fName = fName;
        if (lName) updateData.lName = lName;
        if (address) updateData.address = address;
        if (city) updateData.city = city;
        if (phone) updateData.phone = phone;
        if (dob) updateData.dob = dob;
        if (gender) updateData.gender = gender;
        if (email) updateData.email = email;

        // Handle profile picture upload if present
        if (req.file) {
            try {
                const proPicPath = await uploadFile(req.file);
                updateData.proPic = proPicPath;
            } catch (uploadError) {
                console.error('Error uploading profile picture:', uploadError);
                return res.status(400).json({
                    message: "Error uploading profile picture",
                    error: true,
                    success: false
                });
            }
        }

        // Update user
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).select("-pwd");

        res.status(200).json({
            data: updatedUser,
            success: true,
            error: false,
            message: "Profile updated successfully"
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
};

// Delete current user's account
const deleteUserAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Delete user
        await userModel.findByIdAndDelete(userId);
        
        // Clear authentication cookie
        res.clearCookie("token");
        
        res.status(200).json({
            success: true,
            error: false,
            message: "Account deleted successfully"
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Current password and new password are required",
                error: true,
                success: false
            });
        }
        
        // Get user with password
        const user = await userModel.findById(req.user.id);
        
        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.pwd);
        if (!isPasswordValid) {
            return res.status(400).json({
                message: "Current password is incorrect",
                error: true,
                success: false
            });
        }
        
        // Hash new password
        const salt = bcrypt.genSaltSync(10);
        const hashPassword = bcrypt.hashSync(newPassword, salt);
        
        // Update password
        await userModel.findByIdAndUpdate(req.user.id, { pwd: hashPassword });
        
        res.status(200).json({
            success: true,
            error: false,
            message: "Password changed successfully"
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
};

// Admin: Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await userModel.find().select("-pwd");
        
        res.status(200).json({
            data: users,
            error: false,
            success: true,
            message: "Users fetched successfully"
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || "Failed to fetch users",
            error: true,
            success: false
        });
    }
};

// Admin: Get all users
const getGeneralUsers = async (req, res) => {
    try {
        const users = await userModel.find({
            role: { $regex: /^general$/i }
        }).select("-pwd");
        
        res.status(200).json({
            data: users,
            error: false,
            success: true,
            message: "Users fetched successfully"
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || "Failed to fetch users",
            error: true,
            success: false
        });
    }
};


// Admin: Get a specific user by ID
const getUserById = async (req, res) => {
    try {
        const user = await userModel.findById(req.params.id).select("-pwd");
        
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }
        
        res.status(200).json({
            data: user,
            error: false,
            success: true
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
};

// Admin: Create user
const createUser = async (req, res) => {
    try {
        const { email, pwd, fName, lName, phone, role } = req.body;

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: "User with this email already exists",
                error: true,
                success: false
            });
        }

        // Create new user
        const newUser = new userModel({
            ...req.body,
            pwd: bcrypt.hashSync(pwd, bcrypt.genSaltSync(10)),
            role: role || "GENERAL"
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            error: false,
            message: "User created successfully"
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || "Failed to create user",
            error: true,
            success: false
        });
    }
};

// Admin: Update user
const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const updates = req.body;

        // Remove password if it's empty
        if (!updates.pwd) {
            delete updates.pwd;
        }

        const user = await userModel.findByIdAndUpdate(
            userId,
            updates,
            { new: true }
        ).select("-pwd");

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }

        res.status(200).json({
            data: user,
            success: true,
            error: false,
            message: "User updated successfully"
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || "Failed to update user",
            error: true,
            success: false
        });
    }
};

// Admin: Delete user
const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }
        
        await userModel.findByIdAndDelete(userId);
        
        res.status(200).json({
            success: true,
            error: false,
            message: "User deleted successfully"
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || "Failed to delete user",
            error: true,
            success: false
        });
    }
};

// Export controllers
export { 
    getUserProfile, 
    updateUserProfile,
    deleteUserAccount,
    changePassword,
    getAllUsers, 
    getGeneralUsers,
    getUserById, 
    createUser, 
    updateUser, 
    deleteUser 
};