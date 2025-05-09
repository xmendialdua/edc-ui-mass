# Use Node.js LTS as the base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for the build
ARG API_URL=http://172.16.56.42/consumer/cp/api/management
ENV NEXT_PUBLIC_API_URL=${API_URL}

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set the user to non-root
USER nextjs

# Expose the port
EXPOSE 3001

# Set environment variables for runtime
ENV PORT 3001
ENV HOSTNAME "0.0.0.0"
ENV NEXT_PUBLIC_API_URL=http://172.16.56.42/consumer/cp/api/management

# Start the application
CMD ["node", "server.js"]

