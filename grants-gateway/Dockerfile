# syntax=docker/dockerfile:1.7
# grants-gateway — production image
# Build:  docker build -t farmera/bucket-grants-gateway:v0.1.0-alpha.1 .
# Run:    docker run -p 8789:8789 -e FEED402_WALLET=0x... farmera/bucket-grants-gateway:v0.1.0-alpha.1

FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* tsconfig.json ./
RUN npm install --no-audit --no-fund --silent
COPY src ./src
RUN npx tsc

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8789
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund --silent && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 8789
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:'+ (process.env.PORT||8789) +'/.well-known/feed402.json').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
