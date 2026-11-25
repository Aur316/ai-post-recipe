FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter api...
RUN pnpm --filter "api..." build
RUN pnpm --filter api deploy --legacy --prod /out

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out .
EXPOSE 3000
CMD ["node", "dist/server.js"]
