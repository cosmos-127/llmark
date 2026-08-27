# ==========================================
# Stage 1: Build React 19 Frontend
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Build-time environment argument for backend URL
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . ./
RUN npm run build

# ==========================================
# Stage 2: Production Nginx High-Performance Server
# ==========================================
FROM nginx:alpine AS runner

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
