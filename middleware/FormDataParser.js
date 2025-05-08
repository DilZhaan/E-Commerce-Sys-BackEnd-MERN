import busboy from 'busboy';
import path from 'path';

/**
 * Custom middleware to handle multipart form data
 * This is a fallback for cases where multer has issues with certain form submissions
 */
const parseFormData = (req, res, next) => {
    // Skip if not multipart/form-data
    if (!req.headers['content-type']?.includes('multipart/form-data')) {
        return next();
    }
    
    console.log('Using custom form data parser');
    
    try {
        const bb = busboy({ 
            headers: req.headers,
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB max file size
                files: 5 // Allow multiple file uploads
            }
        });
        
        req.body = {};
        req.file = null;
        req.files = [];
        
        // Handle file fields
        bb.on('file', (name, file, info) => {
            console.log(`Custom parser: File [${name}]: filename: ${info.filename}`);
            
            // Handle all file uploads regardless of field name
            const chunks = [];
            let fileSize = 0;
            
            file.on('data', (data) => {
                chunks.push(data);
                fileSize += data.length;
                
                // Check for file size limits
                if (fileSize > 10 * 1024 * 1024) {
                    console.error('File too large');
                    file.destroy(new Error('File too large'));
                }
            });
            
            file.on('end', () => {
                if (chunks.length) {
                    // Create a file object similar to what multer would provide
                    const fileObj = {
                        fieldname: name,
                        originalname: info.filename,
                        encoding: info.encoding,
                        mimetype: info.mimeType,
                        buffer: Buffer.concat(chunks),
                        size: fileSize
                    };
                    
                    // Store in req.files array
                    req.files.push(fileObj);
                    
                    // Also set it as req.file if it's the first file or matches specific field names
                    if (!req.file || name === 'billImage' || name === 'proPic' || name === 'profilePic') {
                        req.file = fileObj;
                    }
                    
                    console.log(`Custom parser: Finished processing ${name} file, size: ${fileSize} bytes`);
                }
            });
            
            file.on('error', (err) => {
                console.error(`Error processing file upload: ${err.message}`);
            });
        });
        
        // Handle non-file fields
        bb.on('field', (name, val) => {
            console.log(`Custom parser: Field [${name}]: value: ${val}`);
            
            // Parse numeric fields
            if (['purchasedPrice', 'warranty', 'quantity', 'reorderLevel'].includes(name) && !isNaN(val)) {
                req.body[name] = Number(val);
            } else {
                req.body[name] = val;
            }
        });
        
        bb.on('error', (err) => {
            console.error('Custom parser error:', err);
            return res.status(400).json({
                message: `Form parsing error: ${err.message}`,
                error: true,
                success: false
            });
        });
        
        bb.on('close', () => {
            console.log('Custom parser: Form parsing completed');
            next();
        });
        
        req.pipe(bb);
    } catch (err) {
        console.error('Error initializing form parser:', err);
        return res.status(400).json({
            message: `Error processing form: ${err.message}`,
            error: true, 
            success: false
        });
    }
};

export default parseFormData; 