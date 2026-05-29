FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with build auth
ARG NODE_AUTH_TOKEN
RUN echo "@wyre-technology:registry=https://npm.pkg.github.com" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}" >> .npmrc && \
    npm ci --ignore-scripts

# Copy source and build
COPY . .
RUN npm run build

# Prune dev dependencies (must be in builder stage for auth)
RUN npm prune --omit=dev

# Production stage
FROM node:22-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV AUTH_MODE=gateway
ENV MCP_HTTP_PORT=8080
ENV LOG_LEVEL=info

# Create non-root user
RUN addgroup -g 1001 -S mcp && adduser -u 1001 -S mcp -G mcp

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set ownership
RUN chown -R mcp:mcp /app

# OCI labels for GHCR
LABEL org.opencontainers.image.source=https://github.com/wyre-technology/immybot-mcp
LABEL org.opencontainers.image.description="MCP server for ImmyBot - Windows endpoint management and software deployment automation"
LABEL org.opencontainers.image.licenses=Apache-2.0
LABEL io.modelcontextprotocol.server.name="io.github.wyre-technology/immybot-mcp"

# Switch to non-root user
USER mcp

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    http.get('http://localhost:8080/health', (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }).on('error', () => process.exit(1));"

# Start server
CMD ["node", "dist/index.js"]