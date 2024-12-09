
import bcrypt from 'bcryptjs'
import userModel from '../Models/User.Model.js';

const SignUpController = async (req, res) => {
    try {
        const { proPic, fName, lName, address, dob, gender, email, pwd } = req.body

        if (!proPic.trim() || !fName.trim() || !lName.trim() || !address.trim() || !dob.trim() || !gender.trim() || !email.trim() || !pwd.trim()) {
            throw new Error("Please Provide All Information!");
        }

        const salt = bcrypt.genSaltSync(10);
        const hashPwd = bcrypt.hashSync(pwd, salt)

        const userDataObj = {
            ...req.body,
            role: "GENERAL",
            pwd: hashPwd
        }

        const userData = new userModel(userDataObj)
        const saveUser = await userData.save();

        res.status(201).json({
            data: saveUser,
            success: true,
            error: false,
            message: "User Created Successfully!"
        })
    } catch (err) {
        res.status(400).json({
            message: err.message || "An error occurred while processing your request.",
            error: true,
            success: false,
        })
    }
}

export default SignUpController;