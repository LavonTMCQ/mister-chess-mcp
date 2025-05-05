import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { ChessGameManager, ChessGame, ChessMove } from './chess';

export class ChessServer {
  private app: express.Application;
  private server: http.Server;
  private io: SocketIOServer;
  private gameManager: ChessGameManager;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server);
    this.gameManager = new ChessGameManager();

    this.setupRoutes();
    this.setupSocketHandlers();
  }

  /**
   * Set up Express routes
   */
  private setupRoutes(): void {
    // Serve static files
    this.app.use(express.static(path.join(__dirname, '../public')));

    // Parse JSON bodies and set up middleware
    this.app.use(express.json());

    // API routes
    this.app.get('/api/games', (req, res) => {
      const games = this.mcpServer.getGameManager().getAllGames();
      res.json(games);
    });

    this.app.get('/api/games/:id', (req, res) => {
      try {
        const game = this.mcpServer.getGameManager().getGame(req.params.id);
        res.json(game);
      } catch (error) {
        res.status(404).json({ error: 'Game not found' });
      }
    });

    // Additional route handlers

    this.app.post('/api/games', (req, res) => {
      const { whitePlayer, blackPlayer } = req.body;

      if (!whitePlayer || !blackPlayer) {
        res.status(400).json({ error: 'Both whitePlayer and blackPlayer are required' });
        return;
      }

      const game = this.mcpServer.getGameManager().createGame(whitePlayer, blackPlayer);
      res.status(201).json(game);
    });

    this.app.post('/api/games/:id/start', (req, res) => {
      try {
        const game = this.mcpServer.getGameManager().startGame(req.params.id);

        // Notify clients about game start
        this.io.emit('gameUpdated', game);

        res.json(game);
      } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    this.app.post('/api/games/:id/move', (req, res) => {
      const { playerId, move } = req.body;

      if (!playerId || !move) {
        res.status(400).json({ error: 'Both playerId and move are required' });
        return;
      }

      try {
        const game = this.mcpServer.getGameManager().makeMove(
          req.params.id,
          playerId,
          move as ChessMove
        );

        // Notify clients about game update
        this.io.emit('gameUpdated', game);

        res.json(game);
      } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Serve the main HTML file for any other route
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  /**
   * Set up Socket.IO handlers
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Send all games to the newly connected client
      const games = this.mcpServer.getGameManager().getAllGames();
      socket.emit('allGames', games);

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    // Start the MCP server
    await this.mcpServer.start();

    // Start the web server
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`Chess web server started on port ${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    // Stop the MCP server
    await this.mcpServer.stop();

    // Stop the web server
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Chess web server stopped');
          resolve();
        }
      });
    });
  }
}
