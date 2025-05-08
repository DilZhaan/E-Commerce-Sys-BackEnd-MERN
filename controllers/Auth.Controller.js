import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/User.Model.js';
import uploadFile from '../utils/fileUpload.js';

// Handle user signup
const signup = async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('File received:', req.file);
        
        const { fName, lName, address, city, phone, mobileNo, dob, gender, email, pwd } = req.body;
        
        // Use either phone or mobileNo (ensure backwards compatibility)
        const phoneNumber = phone || mobileNo;

        // Validate required fields
        if (!fName?.trim() || !lName?.trim() || !address?.trim() || !dob?.trim() || 
            !gender?.trim() || !email?.trim() || !pwd?.trim()) {
            throw new Error("Please Provide All Information!");
        }

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: "User with this email already exists",
                error: true,
                success: false
            });
        }

        // Handle profile picture upload
        let proPicPath = null;
        if (req.file) {
            try {
                console.log('Uploading file:', req.file.originalname);
                proPicPath = await uploadFile(req.file);
                console.log('File uploaded successfully to:', proPicPath);
            } catch (uploadError) {
                console.error('Error uploading profile picture:', uploadError);
                return res.status(400).json({
                    message: "Error uploading profile picture: " + uploadError.message,
                    error: true,
                    success: false
                });
            }
        } else {
            console.log('No profile picture provided');
        }

        // Hash password
        const salt = bcrypt.genSaltSync(10);
        const hashPwd = bcrypt.hashSync(pwd, salt);

        // Create user data object
        const userDataObj = {
            fName,
            lName,
            address,
            city,
            phone: phoneNumber, // Use the unified phone number
            dob,
            gender,
            email,
            proPic: proPicPath,
            role: "GENERAL",
            pwd: hashPwd
        };

        console.log('Creating user with data:', { ...userDataObj, pwd: '[HIDDEN]' });
        const userData = new userModel(userDataObj);
        const saveUser = await userData.save();

        // Create response object without password
        const userResponse = saveUser.toObject();
        delete userResponse.pwd;

        res.status(201).json({
            data: userResponse,
            success: true,
            error: false,
            message: "User Created Successfully!"
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(400).json({
            message: err.message || "An error occurred while processing your request.",
            error: true,
            success: false,
        });
    }
};

// Handle user signin
const signin = async (req, res) => {
    try {
        const { email, pwd } = req.body;

        if (!email || !pwd) {
            return res.status(400).json({
                message: "Email and password are required",
                error: true,
                success: false
            });
        }

        const user = await userModel.findOne({ email });
        
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }

        const checkPwd = await bcrypt.compare(pwd, user.pwd);
        if (!checkPwd) {
            return res.status(400).json({
                message: "Incorrect password",
                error: true,
                success: false
            });
        }

        // Create token data
        const tokenData = {
            _id: user.id,
            email: user.email,
            role: user.role
        };

        // Generate token
        const token = jwt.sign({
            data: tokenData
        }, process.env.TOKEN_SECRET_KEY, {
            expiresIn: '7d'
        });

        // Cookie options
        const tokenOpt = {
            httpOnly: true,
            secure: true
        };

        // Send response with token
        res.cookie("token", token, tokenOpt).json({
            message: "Login Successfully!",
            data: token,
            success: true,
            error: false,
        });
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false,
        });
    }
};

// Handle user logout
const logout = async (req, res) => {
    try {
        // Clear the token cookie
        res.clearCookie("token").json({
            message: "Logged out successfully",
            success: true,
            error: false
        });
    } catch (err) {
        res.status(500).json({
            message: err.message || "An error occurred during logout",
            error: true,
            success: false
        });
    }
};

// Check authentication status
const checkAuth = async (req, res) => {
    try {
        // Get full user data from database (excluding password)
        const user = await userModel.findById(req.user.id).select("-pwd");
        
        if (!user) {
            return res.status(401).json({
                isAuthenticated: false,
                message: "User not found",
                error: true,
                success: false
            });
        }

        // Return complete user object
        res.status(200).json({
            isAuthenticated: true,
            user: user,
            success: true,
            error: false
        });
    } catch (err) {
        console.error("Auth check error:", err);
        res.status(500).json({
            isAuthenticated: false,
            message: err.message || "An error occurred while checking authentication",
            error: true,
            success: false
        });
    }
};

export { signup, signin, logout, checkAuth }; 