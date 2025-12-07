FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Copy production dependencies and source code
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY . .

# Expose port
EXPOSE 3000

# Run the app
USER bun
CMD ["bun", "run", "src/index.ts"]