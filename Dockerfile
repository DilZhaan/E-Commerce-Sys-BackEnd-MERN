# Use official Node.js LTS image
FROM node:22-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose the port (default 4000, can be overridden by env)
EXPOSE 4000

# Use environment variables from Docker Compose or .env
# Start the application
CMD ["npm", "start"] 