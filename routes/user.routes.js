import express from 'express'
import authToken from '../middleware/AuthToken.middleware.js';
import adminAuth from '../middleware/AdminAuth.middleware.js';
import { handleUpload } from '../middleware/FileUpload.middleware.js';
import parseFormData from '../middleware/FormDataParser.js';
import { 
    getUserProfile, 
    updateUserProfile,
    deleteUserAccount,
    changePassword,
    getAllUsers, 
    getUserById, 
    createUser, 
    updateUser, 
    deleteUser,
    getGeneralUsers 
} from '../controllers/UserDetails.Controller.js';

const userRouter = express.Router()

// User routes (authenticated users)
userRouter.get("/profile", authToken, getUserProfile)
userRouter.put("/profile", authToken, parseFormData, updateUserProfile)
userRouter.delete("/account", authToken, deleteUserAccount)
userRouter.put("/change-password", authToken, changePassword)

// Admin user management routes
userRouter.get("/admin/all", authToken, adminAuth, getAllUsers)
userRouter.get("/admin/general", authToken, adminAuth, getGeneralUsers)
userRouter.get("/admin/:id", authToken, adminAuth, getUserById)
userRouter.post("/admin/users", authToken, adminAuth, parseFormData, createUser)
userRouter.put("/admin/users/:id", authToken, adminAuth, parseFormData, updateUser)
userRouter.delete("/admin/users/:id", authToken, adminAuth, deleteUser)

export default userRouter; 