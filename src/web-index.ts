import { ChessWebServer } from './web-server';

// Create and start the server
const server = new ChessWebServer();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await server.stop();
  process.exit(0);
});

// Start the server
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
