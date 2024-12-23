import express from 'express'
import SignUpController from '../controllers/SignUp.Controller.js';
import SignInController from '../controllers/SignIn.Controller.js';
import authToken from '../middleware/AuthToken.middleware.js';
import userDetailsController from '../controllers/userDetails.Controller.js';

const router = express.Router()
router.post("/SignUp",SignUpController)
router.post("/SignIn",SignInController)
router.get("/user-details",authToken,userDetailsController)

export default router;