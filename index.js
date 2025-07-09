import express from "express";
import cors from "cors";
// import helmet from "helmet";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import DBConnection from "./config/Database.Config.js";
import router from "./routes/index.routes.js";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
// Removing express-fileupload to avoid middleware conflicts
// import fileUpload from 'express-fileupload'

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// app.use(helmet());

// CORS configuration - Allow all origins
app.use(
  cors({
    origin: 'http://40.76.251.17:3000', // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Removing express-fileupload middleware to avoid conflicts with busboy/multer
// app.use(fileUpload({
//     limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
//     createParentPath: true // Creates the directory if it doesn't exist
// }));

app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api", router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);

  // Handle Multer errors
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: `File upload error: ${err.message}`,
      error: true,
      success: false,
    });
  }

  // Handle file upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message: "File too large. Maximum file size is 10MB.",
      error: true,
      success: false,
    });
  }

  // Handle other errors
  res.status(500).json({
    message: err.message || "Something went wrong!",
    error: true,
    success: false,
  });
});

const PORT = process.env.PORT || 4000;

DBConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

export default app;
