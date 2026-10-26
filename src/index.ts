import { Hono } from 'hono';

const app = new Hono();

// Environment variables
const NOTION_API_KEY = process.env.NOTION_API_KEY || '';
const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID || '';
const PORT = process.env.PORT || 3000;

if (!NOTION_API_KEY) {
  throw new Error('NOTION_API_KEY environment variable is required');
}

if (!NOTION_PAGE_ID) {
  throw new Error('NOTION_PAGE_ID environment variable is required');
}

// Notion API headers
const notionHeaders = {
  'Authorization': `Bearer ${NOTION_API_KEY}`,
  'Notion-Version': '2026-03-11',
};

function getBlockType(file: File): 'image' | 'pdf' {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return 'pdf';
  }
  return 'image';
}

/**
 * Step 1: Create a File Upload object in Notion
 */
async function createFileUploadObject() {
  const response = await fetch('https://api.notion.com/v1/file_uploads', {
    method: 'POST',
    headers: notionHeaders,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create file upload object: ${error}`);
  }

  return await response.json();
}

/**
 * Step 2: Upload file contents to Notion's upload URL
 */
async function uploadFileContents(uploadUrl: string, fileBlob: Blob, fileName: string) {
  const formData = new FormData();
  formData.append('file', fileBlob, fileName);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: notionHeaders,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload file: ${error}`);
  }

  return await response.json();
}

/**
 * Step 3: Add a file block (image or pdf) to the Notion page
 */
async function addFileBlockToPage(fileId: string, blockType: 'image' | 'pdf') {
  const body = {
    children: [
      {
        type: blockType,
        [blockType]: {
          caption: [],
          type: 'file_upload',
          file_upload: {
            id: fileId,
          },
        },
      },
    ],
  };

  const response = await fetch(
    `https://api.notion.com/v1/blocks/${NOTION_PAGE_ID}/children`,
    {
      method: 'PATCH',
      headers: {
        ...notionHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add ${blockType} block: ${error}`);
  }

  return await response.json();
}

/**
 * Process a single file upload
 */
async function processFileUpload(file: File) {
  console.log(`Processing file: ${file.name}`);

  const blockType = getBlockType(file);

  // Step 1: Create File Upload object
  const uploadObject = await createFileUploadObject();
  console.log(`Created upload object with ID: ${uploadObject.id}`);

  // Step 2: Upload file contents
  const uploadResult = await uploadFileContents(
    uploadObject.upload_url,
    file,
    file.name
  );
  console.log(`Uploaded file: ${file.name}`);

  // Step 3: Add file block to page
  const blockResult = await addFileBlockToPage(uploadObject.id, blockType);
  console.log(`Added ${blockType} block for: ${file.name}`);

  return {
    fileName: file.name,
    fileId: uploadObject.id,
    blockType,
    success: true,
  };
}

// Serve the HTML form
app.get('/', (c) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Bills</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            max-width: 500px;
            width: 100%;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .form-group {
            margin-bottom: 25px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 600;
            font-size: 14px;
        }
        .file-input-wrapper {
            position: relative;
            border: 2px dashed #667eea;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            background: #f8f9ff;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .file-input-wrapper:hover {
            border-color: #764ba2;
            background: #f0f1ff;
        }
        .file-input-wrapper.drag-over {
            border-color: #764ba2;
            background: #e8e9ff;
        }
        input[type="file"] {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            opacity: 0;
            cursor: pointer;
        }
        .upload-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .upload-text {
            color: #667eea;
            font-weight: 600;
            margin-bottom: 5px;
        }
        .upload-hint {
            color: #999;
            font-size: 12px;
        }
        .file-list {
            margin-top: 15px;
        }
        .file-item {
            background: #f0f1ff;
            padding: 10px 15px;
            border-radius: 8px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
        }
        .file-name {
            color: #333;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .file-size {
            color: #999;
            font-size: 12px;
            margin-left: 10px;
        }
        button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
        }
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .message {
            margin-top: 20px;
            padding: 15px;
            border-radius: 10px;
            font-size: 14px;
            display: none;
        }
        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 0.8s linear infinite;
            margin-right: 8px;
            vertical-align: middle;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📄 Upload Bills</h1>
        <p class="subtitle">Select one or more bill images or PDFs to upload to Notion</p>
        
        <form id="uploadForm">
            <div class="form-group">
                <label>Bills (Required)</label>
                <div class="file-input-wrapper" id="fileInputWrapper">
                    <input 
                        type="file" 
                        name="data" 
                        id="fileInput"
                        accept="image/*,application/pdf"
                        multiple 
                        required
                    >
                    <div class="upload-icon">📎</div>
                    <div class="upload-text">Click to upload or drag and drop</div>
                </div>
                <div class="file-list" id="fileList"></div>
            </div>
            
            <button type="submit" id="submitBtn">
                Upload to Notion
            </button>
        </form>
        
        <div class="message" id="message"></div>
    </div>

    <script>
        const fileInput = document.getElementById('fileInput');
        const fileInputWrapper = document.getElementById('fileInputWrapper');
        const fileList = document.getElementById('fileList');
        const form = document.getElementById('uploadForm');
        const submitBtn = document.getElementById('submitBtn');
        const message = document.getElementById('message');

        let selectedFiles = [];

        // File input change handler
        fileInput.addEventListener('change', (e) => {
            selectedFiles = Array.from(e.target.files);
            displayFileList();
        });

        // Drag and drop handlers
        fileInputWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileInputWrapper.classList.add('drag-over');
        });

        fileInputWrapper.addEventListener('dragleave', () => {
            fileInputWrapper.classList.remove('drag-over');
        });

        fileInputWrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            fileInputWrapper.classList.remove('drag-over');
            selectedFiles = Array.from(e.dataTransfer.files);
            fileInput.files = e.dataTransfer.files;
            displayFileList();
        });

        function displayFileList() {
            if (selectedFiles.length === 0) {
                fileList.innerHTML = '';
                return;
            }

            fileList.innerHTML = selectedFiles.map(file => {
                const size = (file.size / 1024).toFixed(1);
                return \`
                    <div class="file-item">
                        <span class="file-name">\${file.name}</span>
                        <span class="file-size">\${size} KB</span>
                    </div>
                \`;
            }).join('');
        }

        function showMessage(text, type) {
            message.textContent = text;
            message.className = \`message \${type}\`;
            message.style.display = 'block';
            
            if (type === 'success') {
                setTimeout(() => {
                    message.style.display = 'none';
                }, 5000);
            }
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (selectedFiles.length === 0) {
                showMessage('Please select at least one file', 'error');
                return;
            }

            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('data', file);
            });

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Uploading...';
            message.style.display = 'none';

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    showMessage(\`Successfully uploaded \${result.uploaded} file(s) to Notion!\`, 'success');
                    form.reset();
                    selectedFiles = [];
                    fileList.innerHTML = '';
                } else {
                    showMessage(\`Error: \${result.error || 'Upload failed'}\`, 'error');
                }
            } catch (error) {
                showMessage(\`Error: \${error.message}\`, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Upload to Notion';
            }
        });
    </script>
</body>
</html>
  `;
  
  return c.html(html);
});

// Handle file upload
app.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const files = formData.getAll('data') as File[];

    if (files.length === 0) {
      return c.json({ error: 'No files provided' }, 400);
    }

    console.log(`\nProcessing ${files.length} file(s)...`);

    // Process all files
    const results = [];
    for (const file of files) {
      try {
        const result = await processFileUpload(file);
        results.push(result);
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        results.push({
          fileName: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    console.log(`\n✅ Successfully uploaded: ${successCount}`);
    if (failCount > 0) {
      console.log(`❌ Failed: ${failCount}`);
    }

    if (failCount === results.length) {
      return c.json(
        {
          error: 'All uploads failed',
          results,
        },
        500
      );
    }

    return c.json({
      message: `Uploaded ${successCount} of ${results.length} files`,
      uploaded: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Health check endpoint
app.get('/health', async (c) => {
  const timestamp = new Date().toISOString();
  
  // Check Notion API token by fetching current user
  try {
    const response = await fetch('https://api.notion.com/v1/users/me', {
      method: 'GET',
      headers: notionHeaders,
    });

    if (!response.ok) {
      return c.json({
        status: 'error',
        timestamp,
        notion: {
          error: `API returned status ${response.status}`,
        },
      }, 503);
    }

    const userData = await response.json();
    
    return c.json({
      status: 'ok',
      timestamp,
      notion: {
        name: userData.name,
        id: userData.id,
        type: userData.type,
      },
    });
  } catch (error) {
    return c.json({
      status: 'error',
      timestamp,
      notion: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }, 503);
  }
});

console.log(`🚀 Server starting on port ${PORT}...`);
console.log(`📄 Form available at: http://localhost:${PORT}`);
console.log(`🏥 Health check at: http://localhost:${PORT}/health`);

export default {
  port: PORT,
  fetch: app.fetch,
};
