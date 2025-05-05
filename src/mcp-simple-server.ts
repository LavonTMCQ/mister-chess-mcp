import { ChessSimpleMCPServer } from './mcp/simple-server';

// Create and start the MCP server
const server = new ChessSimpleMCPServer();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down MCP server...');
  await server.stop();
  process.exit(0);
});

// Start the server
server.start().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
