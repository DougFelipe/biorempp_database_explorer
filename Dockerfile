FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run ingest:sqlite
RUN npm run export:assets
RUN npm run check:footprint
RUN npm run build


FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV SQLITE_DB_PATH=/app/data/biorempp.sqlite
ENV ASSETS_VERSION=v0.0.2
ENV ASSETS_ROOT_PATH=/app/data/assets

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist
COPY --from=build /app/data ./data

USER node

EXPOSE 3000

CMD ["node", "server/index.mjs"]
