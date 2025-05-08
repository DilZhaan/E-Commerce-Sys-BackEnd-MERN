import multer from 'multer';
import path from 'path';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to allow only images
const fileFilter = (req, file, cb) => {
    console.log('Received file:', file);
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // Accept file
    } else {
        cb(new Error('Only image files are allowed'), false); // Reject file
    }
};

// Create multer middleware with configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    }
});

// Middleware to handle file uploads safely
const handleUpload = (fieldName) => {
    return (req, res, next) => {
        console.log('Content-Type:', req.headers['content-type']);
        
        // Check if the content type is multipart
        if (!req.headers['content-type']?.includes('multipart/form-data')) {
            console.log('Request is not multipart/form-data, skipping file upload');
            return next();
        }
        
        // Use any to accept any file field
        const uploadAny = upload.any();
        
        uploadAny(req, res, (err) => {
            if (err) {
                console.error('Multer error:', err);
                return res.status(400).json({
                    message: `File upload error: ${err.message}`,
                    error: true,
                    success: false
                });
            }
            
            // Check if there are any files
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                // Find the file with the expected field name
                const proPicFile = req.files.find(file => file.fieldname === fieldName);
                if (proPicFile) {
                    // Set the file in req.file so controllers can use it
                    req.file = proPicFile;
                    console.log(`Found ${fieldName} file:`, proPicFile.originalname);
                }
            }
            
            next();
        });
    };
};

export { upload, handleUpload }; 