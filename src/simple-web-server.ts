import express from 'express';
import path from 'path';
import cors from 'cors';

// Create Express app
const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;

// Enable CORS for all routes
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Serve the main HTML file
app.get('/', (req, res) => {
  // Read the HTML file
  const filePath = path.join(__dirname, '../public/game-browser.html');
  let html = require('fs').readFileSync(filePath, 'utf8');

  // Get MCP server URL from environment variable or use default
  let mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';

  // Ensure the URL has the correct protocol
  if (mcpServerUrl && !mcpServerUrl.startsWith('http://') && !mcpServerUrl.startsWith('https://')) {
    mcpServerUrl = 'https://' + mcpServerUrl;
  }

  // Inject the MCP server URL
  html = html.replace(
    '<head>',
    `<head>\n  <script>window.MCP_SERVER_URL = "${mcpServerUrl}";</script>`
  );

  // Send the modified HTML
  res.send(html);
});

// Serve the game browser
app.get('/games', (req, res) => {
  // Read the HTML file
  const filePath = path.join(__dirname, '../public/game-browser.html');
  let html = require('fs').readFileSync(filePath, 'utf8');

  // Get MCP server URL from environment variable or use default
  let mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';

  // Ensure the URL has the correct protocol
  if (mcpServerUrl && !mcpServerUrl.startsWith('http://') && !mcpServerUrl.startsWith('https://')) {
    mcpServerUrl = 'https://' + mcpServerUrl;
  }

  // Inject the MCP server URL
  html = html.replace(
    '<head>',
    `<head>\n  <script>window.MCP_SERVER_URL = "${mcpServerUrl}";</script>`
  );

  // Send the modified HTML
  res.send(html);
});

// Start the server
app.listen(port, () => {
  console.log(`Simple web server started on port ${port}`);
});
