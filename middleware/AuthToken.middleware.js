import jwt from 'jsonwebtoken'

const authToken = async (req, res, next) => {
    try {
        // Check for token in cookies
        let token = req.cookies?.token;
        
        // If no token in cookies, check Authorization header
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }
        
        if (!token) {
            return res.status(401).json({
                message: "Authentication required",
                error: true,
                success: false,
                isAuthenticated: false
            });
        }
        
        jwt.verify(token, process.env.TOKEN_SECRET_KEY, (err, decoded) => {
            if (err) {
                console.error("Token verification error:", err);
                return res.status(401).json({
                    message: "Authentication failed",
                    error: true,
                    success: false,
                    isAuthenticated: false
                });
            }

            // Set user data from token
            req.user = {
                id: decoded.data._id,
                email: decoded.data.email,
                role: decoded.data.role
            };
            
            next();
        });
    } catch (err) {
        console.error("Auth middleware error:", err);
        res.status(401).json({
            message: "Authentication failed",
            error: true,
            success: false,
            isAuthenticated: false
        });
    }
};

export default authToken;