#!/bin/bash

# Navigate to the backend directory
cd "$(dirname "$0")"

# Install dependencies
echo "Installing express-fileupload dependency..."
npm install express-fileupload

echo "Dependencies installed successfully!"
echo "You can now start the server with 'npm run dev' or 'npm start'" 