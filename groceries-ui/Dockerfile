# Use an official slim Node.js image
FROM node:20-slim

# Set a working directory inside the container
WORKDIR /app

# Copy dependency definitions first to leverage Docker build cache
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the app code
COPY . .

# Build-time variable for Docker to accept 
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the Next.js app for production
RUN npm run build

# Cloud Run expects the container to listen on port 8080
EXPOSE 8080

# Start the Next.js production server
CMD ["npm", "run", "start"]