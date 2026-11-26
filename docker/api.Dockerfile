FROM mcr.microsoft.com/playwright:v1.65.1-noble AS build
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm install -g pnpm@10.34.9
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter api...
RUN pnpm --filter "api..." build
RUN pnpm --filter api deploy --legacy --prod /out

FROM mcr.microsoft.com/playwright:v1.65.1-noble
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out .
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
