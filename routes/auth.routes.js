import express from 'express'
import { signup, signin, logout, checkAuth } from '../controllers/Auth.Controller.js';
import authToken from '../middleware/AuthToken.middleware.js';
import { handleUpload } from '../middleware/FileUpload.middleware.js';
import parseFormData from '../middleware/FormDataParser.js';

const authRouter = express.Router()

// Authentication routes
// Use only parseFormData for signup to avoid middleware conflicts
authRouter.post("/signup", parseFormData, signup)
authRouter.post("/signin", signin)
authRouter.post("/logout", logout)
authRouter.get("/check", authToken, checkAuth)

export default authRouter; 