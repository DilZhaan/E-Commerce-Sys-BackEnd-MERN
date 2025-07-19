import { uploadToCloudinary } from './cloudinary.js';

/**
 * Uploads a file to Cloudinary
 * @param {Object} file - File object from request
 * @param {string} folder - Folder name within Cloudinary
 * @returns {Promise<Object>} - Object containing the Cloudinary URL and public_id
 */
const uploadFile = async (file, folder = 'profile-pics') => {
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
            throw new Error('No file provided');
        }
        
        // Check for required file properties
        if (!file.buffer) {
            throw new Error('File buffer is missing');
        }
        
        // Upload to Cloudinary
        const result = await uploadToCloudinary(file.buffer, folder);
        
        return {
            url: result.url,
            public_id: result.public_id
        };
    } catch (error) {
        console.error('Error in uploadFile:', error);
        throw error;
    }
};

export default uploadFile; 