import { ChessMCPOfficialServer } from './mcp/official-server';

// Create and start the MCP server
const server = new ChessMCPOfficialServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down MCP server...');
  process.exit(0);
});

// Start the server
server.start().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
