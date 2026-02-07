# ---------- Build stage ----------
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json ./

# Install deps (includes dev deps needed to build)
RUN npm ci

# Copy source
COPY . .

# Build-time variable
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build Next.js
RUN npm run build


# ---------- Runtime stage ----------
FROM node:20-slim

WORKDIR /app

# Copy only what we need from the build stage
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Cloud Run port
EXPOSE 8080

# Start Next.js
CMD ["npm", "run", "start"]