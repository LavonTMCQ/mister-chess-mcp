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
  res.sendFile(path.join(__dirname, '../public/simple.html'));
});

// Serve the game browser
app.get('/games', (req, res) => {
  // Read the HTML file
  const filePath = path.join(__dirname, '../public/game-browser.html');
  let html = require('fs').readFileSync(filePath, 'utf8');

  // Get MCP server URL from environment variable or use default
  const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';

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
