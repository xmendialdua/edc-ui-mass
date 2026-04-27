# Frontend Dockerfile for POC Next
# Next.js application

# Use Node.js 18 as the base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies using pnpm (no frozen lockfile for Docker build)
RUN corepack enable pnpm && \
    pnpm install --no-frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build arguments for all NEXT_PUBLIC_* variables
ARG NEXT_PUBLIC_API_URL=http://localhost:5001
ARG NEXT_PUBLIC_APP_NAME="POC Next Dashboard"
ARG NEXT_PUBLIC_APP_VERSION="0.1.0"
ARG NEXT_PUBLIC_AZURE_CLIENT_ID=""
ARG NEXT_PUBLIC_AZURE_TENANT_ID=""
ARG NEXT_PUBLIC_AZURE_REDIRECT_URI=""
ARG NEXT_PUBLIC_SHAREPOINT_SITE_URL=""

# Set environment variables for build
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION}
ENV NEXT_PUBLIC_AZURE_CLIENT_ID=${NEXT_PUBLIC_AZURE_CLIENT_ID}
ENV NEXT_PUBLIC_AZURE_TENANT_ID=${NEXT_PUBLIC_AZURE_TENANT_ID}
ENV NEXT_PUBLIC_AZURE_REDIRECT_URI=${NEXT_PUBLIC_AZURE_REDIRECT_URI}
ENV NEXT_PUBLIC_SHAREPOINT_SITE_URL=${NEXT_PUBLIC_SHAREPOINT_SITE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN corepack enable pnpm && \
    pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Set the user to non-root
USER nextjs

# Expose the port
EXPOSE 3001

# Set environment variables for runtime
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node_modules/.bin/next", "start", "-p", "3001"]
