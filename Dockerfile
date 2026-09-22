FROM node:22-bookworm-slim AS client-build

WORKDIR /build/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./

ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM node:22-bookworm-slim AS server-runtime

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
COPY --from=client-build /build/client/dist /app/client-dist

RUN mkdir -p /app/data/backups /app/data/private-documents

ENV NODE_ENV=development \
    PORT=5000 \
    HOST=0.0.0.0 \
    LOCAL_ONLY=false \
    DATABASE_URL=file:/app/data/dentalpro.db \
    CLIENT_DIST_DIR=/app/client-dist \
    PRIVATE_DOCUMENTS_DIR=/app/data/private-documents \
    BACKUP_DIR=/app/data/backups

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
