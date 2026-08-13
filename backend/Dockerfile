FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY db.js server.js ./
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3001
CMD ["node", "server.js"]
