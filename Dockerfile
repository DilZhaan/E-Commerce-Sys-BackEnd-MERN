# Use Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (better layer caching)
COPY --chown=node:node package*.json ./
RUN npm ci --only=production

# Copy rest of the code with explicit permissions
COPY --chown=node:node . .

# Create uploads directory with proper permissions
RUN mkdir -p ./public/uploads \
    && chown -R node:node /app \
    && chmod -R 755 /app

# Switch to non-root user
USER node

# Expose backend port
EXPOSE 5000

# Start backend
CMD ["node", "index.js"]