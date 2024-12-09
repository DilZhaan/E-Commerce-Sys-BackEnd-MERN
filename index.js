import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import DBConnection from './config/Database.Config.js'
import router from './routes/index.routes.js'

dotenv.config()

const app = express()
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}))
app.use(express.json({ limit: "10mb" })); 


app.use(cookieParser())
app.use("/api",router)

const PORT = process.env.PORT || 3090

DBConnection().then(() => {
    app.listen(PORT, () => {
        console.log(process.env.FRONTEND_URL);
        
        console.log(`Server is Running in ${PORT}`);
    })
})