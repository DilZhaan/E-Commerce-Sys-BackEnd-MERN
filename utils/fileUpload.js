import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Uploads a file to the server
 * @param {Object} file - File object from request
 * @param {string} folder - Folder name within uploads directory
 * @returns {string} - Path to the uploaded file (relative to server root)
 */
const uploadFile = (file, folder = 'profile-pics') => {
    return new Promise((resolve, reject) => {
        try {
            console.log('uploadFile received file:', {
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                encoding: file.encoding,
                fieldname: file.fieldname,
                hasBuffer: !!file.buffer
            });
            
            // Check if file exists
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }
            
            // Check for required file properties
            if (!file.buffer) {
                reject(new Error('File buffer is missing'));
                return;
            }
            
            if (!file.originalname) {
                // Generate a random filename if original name is missing
                file.originalname = `file_${Date.now()}.jpg`;
                console.log('Generated filename:', file.originalname);
            }
            
            // Get uploads directory path from .env or use default
            const uploadsDir = process.env.UPLOAD_PATH || './uploads';
            
            // Create full path to target folder
            const targetDir = path.join(__dirname, '..', uploadsDir, folder);
            console.log('Target directory:', targetDir);
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
                console.log('Created directory:', targetDir);
            }
            
            // Generate unique filename
            const fileExt = path.extname(file.originalname) || '.jpg';
            const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
            const filePath = path.join(targetDir, fileName);
            
            console.log('Writing file to:', filePath);
            
            // Write file to disk
            fs.writeFileSync(filePath, file.buffer);
            console.log('File written successfully');
            
            // Return relative path from server root
            const relativePath = path.join(uploadsDir, folder, fileName).replace(/\\/g, '/');
            console.log('Returning relative path:', relativePath);
            
            resolve(relativePath);
        } catch (error) {
            console.error('Error in uploadFile:', error);
            reject(error);
        }
    });
};

export default uploadFile; 