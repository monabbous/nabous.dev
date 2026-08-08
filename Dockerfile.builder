FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@8.15.9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

CMD ["pnpm", "build"]