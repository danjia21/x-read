FROM node:24-alpine AS build
WORKDIR /app
COPY site/package.json site/package-lock.json ./
RUN npm ci
COPY site/ ./
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY site/package.json site/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY site/server/ ./server/
COPY site/src/content.js site/src/cache.js site/src/config.js site/src/library-notes.js ./src/
USER node
EXPOSE 3000
CMD ["node", "server/server.js"]
