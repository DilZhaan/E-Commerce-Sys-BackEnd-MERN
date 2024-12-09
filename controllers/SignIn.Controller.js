import jwt from 'jsonwebtoken'
import userModel from "../Models/User.Model.js"
import bcrypt from 'bcryptjs'

const SignInController = async (req, res) => {
  try {
    const { email, pwd } = req.body

    const user = await userModel.findOne({ email })


    const checkPwd = await bcrypt.compare(pwd, user.pwd)
    if (checkPwd) {
      const tokenData = {
        _id:user.id,
        email:user.email,
      }
      const token = jwt.sign({
        data: tokenData
      }, process.env.TOKEN_SECRET_KEY, {
        expiresIn: '1h'
      }
      )
      const tokenOpt = {
        httpOnly: true,
        secure: true
      }
      res.cookie("token", token, tokenOpt).json({
        message: "Login Successfully!",
        data: token,
        success: true,
        error: false,
      })
    } else {
      throw new Error("Please Check the Password!")
    }
  } catch (err) {
    res.json({
      message: err.message || err,
      error: true,
      success: false,
    })
  }
}

export default SignInController;