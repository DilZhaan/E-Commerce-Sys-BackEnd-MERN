import mongoose from "mongoose";

const DBConnection = async() => {
    try{
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("Database Connection Successfull!")
    }catch(err){
        console.error(err);
        
    }
    
}

export default DBConnection;