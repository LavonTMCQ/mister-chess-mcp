import { MCPServer } from '@mastra/mcp';
import { ChessGameManager } from '../chess';
import { createChessMCPTools } from './tools';
import express from 'express';
import http from 'http';

export class ChessMCPServer {
  private mcpServer: MCPServer;
  private app: express.Application;
  private server: http.Server;
  private gameManager: ChessGameManager;
  private port: number;

  constructor(port: number = 3001) {
    this.port = port;
    this.gameManager = new ChessGameManager();

    // Create MCP tools
    const tools = createChessMCPTools(this.gameManager);

    // Create MCP server
    this.mcpServer = new MCPServer({
      name: "Chess MCP Server",
      version: "1.0.0",
      tools
    });

    // Create Express app
    this.app = express();
    this.server = http.createServer(this.app);

    // Set up routes for the MCP server
    this.setupRoutes();
  }

  /**
   * Set up Express routes
   */
  private setupRoutes(): void {
    // Simple API endpoint to check if the server is running
    this.app.get('/api/status', (req, res) => {
      res.json({ status: 'ok', message: 'Chess MCP server is running' });
    });

    // API endpoint to get all tools
    this.app.get('/api/tools', (req, res) => {
      res.json({ tools: Object.keys(this.mcpServer.tools()) });
    });

    // Fallback route
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    // Start the MCP server in stdio mode
    await this.mcpServer.startStdio();

    // Start the web server
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`Chess MCP server started on port ${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Chess MCP server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Get the game manager
   */
  getGameManager(): ChessGameManager {
    return this.gameManager;
  }
}
