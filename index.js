import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import DBConnection from './config/Database.Config.js'
import router from './routes/index.routes.js'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
// Removing express-fileupload to avoid middleware conflicts
// import fileUpload from 'express-fileupload'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors({
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : 'http://localhost:3000',
    credentials: true,
}))
app.use(express.json({ limit: "10mb" })); 
app.use(express.urlencoded({ extended: true }))

// Removing express-fileupload middleware to avoid conflicts with busboy/multer
// app.use(fileUpload({
//     limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
//     createParentPath: true // Creates the directory if it doesn't exist
// }));

app.use(cookieParser())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use("/api",router)

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    
    // Handle Multer errors
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            message: `File upload error: ${err.message}`,
            error: true,
            success: false
        });
    }
    
    // Handle file upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            message: 'File too large. Maximum file size is 10MB.',
            error: true,
            success: false
        });
    }
    
    // Handle other errors
    res.status(500).json({
        message: err.message || 'Something went wrong!',
        error: true,
        success: false
    });
});

const PORT = process.env.PORT || 4000

DBConnection().then(() => {
    app.listen(PORT, () => {
        console.log(process.env.FRONTEND_URL);
        
        console.log(`Server is Running in ${PORT}`);
    })
})

export default app