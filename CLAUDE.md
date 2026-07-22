# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file Bun + Hono web app ("Notion Bill Uploader") that replicates an n8n workflow: it serves an HTML upload form and forwards uploaded bill images or PDFs to a Notion page as image or pdf blocks. Everything lives in `src/index.ts` — there is no build step, router split, or test suite.

## Commands

```bash
bun install              # install dependencies
bun run dev              # dev server with hot reload (bun --watch)
bun run start             # run without watch mode
NODE_ENV=production bun run start   # production run
docker-compose up -d      # build and run the app + cloudflared tunnel together
docker-compose logs -f    # tail logs
docker-compose down       # stop
```

There are no lint, typecheck, or test scripts configured in `package.json`.

## Required environment

The app throws at startup if these are missing (see `src/index.ts`):

- `NOTION_API_KEY` — Notion internal integration token
- `NOTION_PAGE_ID` — target Notion page for uploaded images

Optional: `PORT` (default 3000), `NODE_ENV`, `CLOUDFLARED_TUNNEL_TOKEN` (only used by the `cloudflared` service in `docker-compose.yml`). Copy `.env.example` to `.env` for local dev.

## Architecture

`src/index.ts` is a Hono app with three routes:

- `GET /` — returns an inline HTML/CSS/JS page (drag-and-drop multi-file upload form). The markup is a template string in the route handler, not a separate view file.
- `POST /upload` — reads `multipart/form-data`, pulls all files from the `data` field, and runs each through `processFileUpload`, which performs the three-step Notion upload sequence:
  1. `createFileUploadObject()` — `POST /v1/file_uploads` to get an `upload_url` and object `id`.
  2. `uploadFileContents()` — `POST` the file as `FormData` to that `upload_url`.
  3. `addFileBlockToPage()` — `PATCH /v1/blocks/{NOTION_PAGE_ID}/children` to append an image or pdf block (chosen by `getBlockType()` based on the file's MIME type/extension) referencing the uploaded file by `id`.
  Each file is processed independently and sequentially (`for...of`, not `Promise.all`); a failure on one file doesn't stop the others, and the response reports per-file `success`/`error` plus aggregate `uploaded`/`failed` counts.
- `GET /health` — verifies Notion connectivity by calling `/v1/users/me` with the configured token; used by the Docker healthcheck.

Deployment: `Dockerfile` is a multi-stage Bun build (frozen lockfile, production deps only, runs as the `bun` user). `docker-compose.yml` runs this app alongside a `cloudflared` sidecar so the service can be exposed publicly via Cloudflare Tunnel without opening inbound ports; the tunnel is expected to point at `http://billsup:3000`.
