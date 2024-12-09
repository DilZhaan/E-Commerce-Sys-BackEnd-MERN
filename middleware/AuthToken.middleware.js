import jwt from'jsonwebtoken'

const authToken = async (req, res, next) => {
    
    try {
        const token = req.cookies?.token
        if(!token){
            return res.json({
                message:"User is not logged to the System",
                error:true,
                success:false
            })
        }
        
        
        jwt.verify(token,process.env.TOKEN_SECRET_KEY,(err,decoded)=>{
            if(err){
                console.log("Authentication Error",err);                
            }
            req.user = req.user || {}
            req.user.id = decoded.data._id
            req.user.email = decoded.data.email
            next()
        })
        
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            data:[],
            error:true,
            success:false,
        })
    }
}

export default authToken;