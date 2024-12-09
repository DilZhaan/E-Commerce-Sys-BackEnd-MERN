import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    proPic:String,
    fName: String,
    lName: String,
    address: String,
    dob:Date,
    gender:String,
    email: {
        type: String,
        unique: true,
        required: true
    },
    pwd: {
        type: String,
        required: true
    },
},
    {
        timestamps: true
    }
)

const userModel = mongoose.models.User || mongoose.model('User', userSchema); // <-- Updated line


export default userModel;