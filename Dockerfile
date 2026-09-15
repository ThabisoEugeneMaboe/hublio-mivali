FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY api ./api
COPY wwwroot ./wwwroot
ENV PORT=8080
EXPOSE 8080
CMD ["node", "api/server.js"]
