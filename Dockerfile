# Development Dockerfile for ContextFlow Chrome Extension
FROM node:20-alpine

# Install dependencies for Chrome/Chromium (useful for potential testing)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Expose Vite dev server port (for HMR WebSocket)
EXPOSE 5173

# Default command runs dev mode with watch
CMD ["npm", "run", "dev"]
