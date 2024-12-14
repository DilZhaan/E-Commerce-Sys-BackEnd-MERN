import userModel from "../models/User.Model.js";

const userDetailsController = async (req,res) => {
    
    try{
        const user = await userModel.findById(req.user.id)

        res.status(200).json({
            data: user,
            error:false,
            success:true
        })

    }catch(err) {
        res.status(400).json({
            message: err.message || err,
            error:true,
            success:false
        })
    }
}
export default userDetailsController;