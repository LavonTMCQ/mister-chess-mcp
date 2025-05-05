import express from 'express';
import http from 'http';
import cors from 'cors';
import { ChessGameManager, ChessMove } from '../chess';

export class ChessSimpleMCPServer {
  private app: express.Application;
  private server: http.Server;
  private gameManager: ChessGameManager;
  private port: number;

  constructor(port?: number) {
    // Get port from environment variable or use default
    this.port = port || (process.env.PORT ? parseInt(process.env.PORT) : 3001);
    this.gameManager = new ChessGameManager();

    // Create Express app
    this.app = express();
    this.server = http.createServer(this.app);

    // Set up routes
    this.setupRoutes();
  }

  /**
   * Set up Express routes
   */
  private setupRoutes(): void {
    // Enable CORS for all routes
    this.app.use(cors());

    // Parse JSON bodies
    this.app.use(express.json());

    // API endpoint to check if the server is running
    this.app.get('/api/status', (req, res) => {
      res.json({ status: 'ok', message: 'Chess MCP server is running' });
    });

    // API endpoint to get all tools
    this.app.get('/api/tools', (req, res) => {
      res.json({
        tools: [
          'connect_chess_platform',
          'create_game',
          'start_game',
          'get_game_state',
          'submit_move',
          'wait_for_turn',
          'get_player_games',
          'find_available_game',
          'join_game',
          'get_all_games'
        ]
      });
    });

    // API endpoint to call a tool
    this.app.post('/api/tools/call', (req, res) => {
      const { name, args } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Tool name is required' });
        return;
      }

      try {
        let result;

        switch (name) {
          case 'connect_chess_platform':
            result = {
              success: true,
              message: `Agent ${args.agentId} connected to the chess platform`,
              agentId: args.agentId
            };
            break;

          case 'create_game':
            let game;

            // Check if we're creating an open game
            if (args.createOpenGame) {
              game = this.gameManager.createOpenGame(args.playerId, args.playerColor);
              result = {
                success: true,
                message: `Open game created with ID ${game.id}. Waiting for a ${args.playerColor === 'white' ? 'black' : 'white'} player to join.`,
                gameId: game.id
              };
            } else {
              // Create a normal game with both players specified
              game = this.gameManager.createGame(args.whitePlayerId, args.blackPlayerId);
              result = {
                success: true,
                message: `Game created with ID ${game.id}`,
                gameId: game.id
              };
            }
            break;

          case 'start_game':
            const startedGame = this.gameManager.startGame(args.gameId);
            result = {
              success: true,
              message: `Game ${args.gameId} started`,
              game: startedGame
            };
            break;

          case 'get_game_state':
            const gameState = this.gameManager.getGame(args.gameId);
            result = {
              success: true,
              game: gameState
            };
            break;

          case 'submit_move':
            try {
              const updatedGame = this.gameManager.makeMove(
                args.gameId,
                args.playerId,
                args.move as ChessMove
              );
              result = {
                success: true,
                message: `Move from ${args.move.from} to ${args.move.to} submitted`,
                game: updatedGame
              };
            } catch (error) {
              result = {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
              };
            }
            break;

          case 'wait_for_turn':
            const turnGame = this.gameManager.getGame(args.gameId);
            const isPlayerTurn =
              (turnGame.state.turn === 'w' && turnGame.whitePlayer === args.playerId) ||
              (turnGame.state.turn === 'b' && turnGame.blackPlayer === args.playerId);
            result = {
              success: true,
              isYourTurn: isPlayerTurn,
              game: turnGame
            };
            break;

          case 'get_player_games':
            const playerGames = this.gameManager.getPlayerGames(args.playerId);
            result = {
              success: true,
              games: playerGames
            };
            break;

          case 'get_all_games':
            // Get all games
            const allGames = this.gameManager.getAllGames();
            result = {
              success: true,
              games: allGames
            };
            break;

          case 'find_available_game':
            // Find games that are in 'waiting' status
            const games = this.gameManager.getAllGames();
            const availableGames = games.filter(game =>
              game.status === 'waiting' &&
              (args.preferredColor === 'any' ||
               (args.preferredColor === 'white' && game.whitePlayer === '') ||
               (args.preferredColor === 'black' && game.blackPlayer === ''))
            );

            result = {
              success: true,
              availableGames
            };
            break;

          case 'join_game':
            try {
              const gameToJoin = this.gameManager.getGame(args.gameId);

              // Check if the game is in waiting status
              if (gameToJoin.status !== 'waiting') {
                throw new Error('Game is not in waiting status');
              }

              // Check if the requested position is available
              if (args.color === 'white' && gameToJoin.whitePlayer !== '') {
                throw new Error('White player position is already taken');
              }

              if (args.color === 'black' && gameToJoin.blackPlayer !== '') {
                throw new Error('Black player position is already taken');
              }

              // Update the game with the new player
              if (args.color === 'white') {
                gameToJoin.whitePlayer = args.playerId;
              } else if (args.color === 'black') {
                gameToJoin.blackPlayer = args.playerId;
              }

              gameToJoin.updatedAt = new Date();

              // Check if both players are now assigned and start the game if they are
              if (gameToJoin.whitePlayer !== '' && gameToJoin.blackPlayer !== '') {
                gameToJoin.status = 'active';
              }

              result = {
                success: true,
                message: `Player ${args.playerId} joined game ${args.gameId} as ${args.color}`,
                game: gameToJoin
              };
            } catch (error) {
              result = {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
              };
            }
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        res.json(result);
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
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
