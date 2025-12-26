FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && pnpm i
COPY . .
RUN pnpm build
EXPOSE 8080
CMD ["node","dist/index.js"]
