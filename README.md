# Notion Bill Uploader

A Bun-based web application that replicates your n8n workflow for uploading bill images or PDFs to Notion. This app provides a clean web form interface for uploading multiple images or PDFs directly to a Notion page.

## Features

- 📄 **Multi-file Upload**: Upload multiple bill images or PDFs at once
- 🎨 **Beautiful UI**: Modern, responsive form with drag-and-drop support
- 🚀 **Fast**: Built with Bun for optimal performance
- 🐳 **Docker Ready**: Containerized for easy deployment
- ☁️ **Cloudflare Tunnel**: Optional secure tunnel for public access
- 🔄 **Notion Integration**: Seamlessly uploads images and PDFs to your Notion page

## Workflow

This app replicates the following n8n workflow:

1. **Form Submission**: User uploads files via web form
2. **Split Files**: Each file is processed individually
3. **Create Upload Object**: Creates a Notion file upload object
4. **Upload File**: Uploads file contents to Notion's storage
5. **Add File Block**: Adds an image or pdf block to specified Notion page

## Prerequisites

- [Bun](https://bun.sh) installed (for local development)
- [Docker](https://docker.com) and Docker Compose (for deployment)
- Notion API Integration with access to your target page

## Setup

### 1. Create Notion Integration

1. Go to the [Notion Developer Portal](https://app.notion.com/developers/connections)
2. Under "Build", select "Internal connections", then click "Create a new connection"
3. Give it a name (e.g., "Bill Uploader") and select your workspace
4. Open the "Configuration" tab and copy the "API token"

### 2. Get Notion Page ID

1. Open the Notion page where you want to upload images
2. Click the "•••" menu in the top right, then select "Connections"
3. Click "Add connection", search for your integration, and confirm access
4. The page ID is in the page URL: `https://notion.so/workspace/PAGE_ID`

### 3. Set Up Cloudflare Tunnel

To make your app publicly accessible without opening ports:

1. Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. Navigate to "Networks" > "Tunnels"
3. Click "Create a tunnel"
4. Choose "Cloudflared" and give it a name
5. Copy the tunnel token
6. Configure the tunnel to point to `http://billsup:3000`

### 4. Configure Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_PAGE_ID=
PORT=3000
NODE_ENV=production
CLOUDFLARED_TUNNEL_TOKEN=
```

## Local Development

### Install Dependencies

```bash
bun install
```

### Run Development Server

```bash
bun run dev
```

The application will be available at `http://localhost:3000`

### Run Production Build

```bash
NODE_ENV=production bun run start
```

## Docker Deployment

### Build and Run with Docker Compose

```bash
docker-compose up -d
```

This will:
- Build the Docker image
- Start the billsup container
- Start the cloudflared tunnel
- Enable health checks
- Auto-restart on failure

### Stop the Container

```bash
docker-compose down
```

### View Logs

```bash
docker-compose logs -f
```

### Manual Docker Build

If you prefer to build manually:

```bash
# Build the image
docker build -t notion-bill-uploader .

# Run the container
docker run -d \
  -p 3000:3000 \
  -e NOTION_API_KEY=your_api_key \
  -e NOTION_PAGE_ID=your_page_id \
  -e NODE_ENV=production \
  --name notion-bill-uploader \
  notion-bill-uploader

## Usage

1. Open your browser to `http://localhost:3000`
2. Click the upload area or drag and drop bill images or PDFs
3. Click "Upload to Notion"
4. Your images and PDFs will be added to the specified Notion page

## API Endpoints

### `GET /`
Serves the upload form HTML interface

### `POST /upload`
Handles file uploads

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with `data` field containing file(s)

**Response:**
```json
{
  "message": "Uploaded 3 of 3 files",
  "uploaded": 3,
  "failed": 0,
  "results": [
    {
      "fileName": "bill1.jpg",
      "fileId": "abc123",
      "blockType": "image",
      "success": true
    }
  ]
}
```

### `GET /health`
Health check endpoint for monitoring

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-07T14:30:00.000Z"
}
```

## Project Structure

```
.
├── src/
│   └── index.ts          # Main application file
├── .dockerignore         # Docker ignore rules
├── .env.example          # Environment variable template
├── .gitignore           # Git ignore rules
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile           # Docker build instructions
├── package.json         # Project dependencies
└── README.md           # This file
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NOTION_API_KEY` | Yes | - | Your Notion integration token |
| `NOTION_PAGE_ID` | No | - | Target Notion page ID |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment mode (set to `production` for production) |
| `CLOUDFLARED_TUNNEL_TOKEN` | No | - | Cloudflare Tunnel token for secure public access |

## Troubleshooting

### "Failed to create file upload object"
- Check that your `NOTION_API_KEY` is correct
- Verify the integration has been added to the target page

### "Failed to add image block" / "Failed to add pdf block"
- Ensure `NOTION_PAGE_ID` is correct
- Verify the integration has edit permissions on the page
- Check that the page exists and is accessible

### Docker Container Won't Start
- Check logs: `docker-compose logs`
- Verify environment variables are set correctly
- Ensure port 3000 is not already in use

## Security Considerations

- Never commit `.env` file to version control
- Keep your Notion API key secure
- Consider adding rate limiting for production use
- Use HTTPS in production environments

## Performance

- Built with Bun for fast startup and execution
- Supports multiple concurrent file uploads
- Efficient file streaming to Notion API
- Docker image uses multi-stage build for smaller size

## License

MIT

## Support

For issues or questions, please open an issue on GitHub or contact the maintainer.
