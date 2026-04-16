FROM node:22-bookworm-slim AS base

WORKDIR /app
COPY package*.json ./


FROM base AS dev

RUN npm ci

COPY . .

ENV NODE_ENV=development
ENV PORT=3101
ENV SQLITE_DB_PATH=/app/data/biorempp.sqlite
ENV BIOREMPP_URL_BASE_PATH=/bioremppdbx/
ENV VITE_BIOREMPP_URL_BASE_PATH=/bioremppdbx/
ENV VITE_DEV_API_ORIGIN=http://127.0.0.1:3101

EXPOSE 5173
EXPOSE 3101

CMD ["npm", "run", "dev"]


FROM base AS build

RUN npm ci

COPY . .

ARG VITE_BIOREMPP_URL_BASE_PATH=/
ENV VITE_BIOREMPP_URL_BASE_PATH=${VITE_BIOREMPP_URL_BASE_PATH}

RUN npm run ingest:sqlite
RUN npm run check:footprint
RUN npm run build


FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV SQLITE_DB_PATH=/app/data/biorempp.sqlite
ENV BIOREMPP_URL_BASE_PATH=/

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist
COPY --from=build /app/data/biorempp.sqlite ./data/biorempp.sqlite

USER node

EXPOSE 3000

CMD ["node", "server/index.mjs"]
