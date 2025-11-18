FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copy all packages
COPY packages ./packages
COPY tsconfig.json .eslintrc.js .prettierrc ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @z402/backend db:generate

EXPOSE 3001

CMD ["pnpm", "--filter", "@z402/backend", "dev"]
