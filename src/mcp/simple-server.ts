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
              games: availableGames
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

    // MCP protocol endpoint for streamable-http transport
    this.app.post('/mcp', (req, res) => {
      const body = req.body;

      if (body.type === 'initialize') {
        // Handle initialize request
        res.json({
          type: 'initialize_response',
          id: body.id,
          server: {
            name: 'Chess MCP Server',
            version: '1.0.0'
          },
          capabilities: {
            tools: {
              connect_chess_platform: {
                description: 'Connect to the chess platform with a unique agent ID',
                parameters: {
                  type: 'object',
                  properties: {
                    agentId: {
                      type: 'string',
                      description: 'Agent ID'
                    }
                  },
                  required: ['agentId']
                }
              },
              create_game: {
                description: 'Create a new chess game',
                parameters: {
                  type: 'object',
                  properties: {
                    createOpenGame: {
                      type: 'boolean',
                      description: 'Create an open game that others can join'
                    },
                    playerId: {
                      type: 'string',
                      description: 'Player ID'
                    },
                    playerColor: {
                      type: 'string',
                      description: 'Player color (white or black)'
                    }
                  },
                  required: ['createOpenGame', 'playerId', 'playerColor']
                }
              },
              start_game: {
                description: 'Start a chess game',
                parameters: {
                  type: 'object',
                  properties: {
                    gameId: {
                      type: 'string',
                      description: 'Game ID'
                    }
                  },
                  required: ['gameId']
                }
              },
              get_game_state: {
                description: 'Get the current state of a chess game',
                parameters: {
                  type: 'object',
                  properties: {
                    gameId: {
                      type: 'string',
                      description: 'Game ID'
                    }
                  },
                  required: ['gameId']
                }
              },
              submit_move: {
                description: 'Submit a move in a chess game',
                parameters: {
                  type: 'object',
                  properties: {
                    gameId: {
                      type: 'string',
                      description: 'Game ID'
                    },
                    playerId: {
                      type: 'string',
                      description: 'Player ID'
                    },
                    move: {
                      type: 'object',
                      description: 'Chess move',
                      properties: {
                        from: {
                          type: 'string',
                          description: 'From square'
                        },
                        to: {
                          type: 'string',
                          description: 'To square'
                        },
                        promotion: {
                          type: 'string',
                          description: 'Promotion piece'
                        }
                      },
                      required: ['from', 'to']
                    }
                  },
                  required: ['gameId', 'playerId', 'move']
                }
              },
              wait_for_turn: {
                description: 'Wait for your turn in a chess game',
                parameters: {
                  type: 'object',
                  properties: {
                    gameId: {
                      type: 'string',
                      description: 'Game ID'
                    },
                    playerId: {
                      type: 'string',
                      description: 'Player ID'
                    }
                  },
                  required: ['gameId', 'playerId']
                }
              },
              get_player_games: {
                description: 'Get all games for a player',
                parameters: {
                  type: 'object',
                  properties: {
                    playerId: {
                      type: 'string',
                      description: 'Player ID'
                    }
                  },
                  required: ['playerId']
                }
              },
              find_available_game: {
                description: 'Find games that are waiting for players',
                parameters: {
                  type: 'object',
                  properties: {
                    preferredColor: {
                      type: 'string',
                      description: 'Preferred color (white, black, or any)'
                    }
                  }
                }
              },
              join_game: {
                description: 'Join an existing game',
                parameters: {
                  type: 'object',
                  properties: {
                    gameId: {
                      type: 'string',
                      description: 'Game ID'
                    },
                    playerId: {
                      type: 'string',
                      description: 'Player ID'
                    },
                    color: {
                      type: 'string',
                      description: 'Color to play as (white or black)'
                    }
                  },
                  required: ['gameId', 'playerId']
                }
              },
              get_all_games: {
                description: 'Get all games on the platform',
                parameters: {
                  type: 'object',
                  properties: {}
                }
              }
            }
          }
        });
      } else if (body.type === 'tool_call') {
        // Handle tool call request
        const toolName = body.name;
        const toolArgs = body.args;

        // Process the tool call directly
        try {
          let result;

          switch (toolName) {
            case 'connect_chess_platform':
              result = {
                success: true,
                message: `Agent ${toolArgs.agentId} connected to the chess platform`,
                agentId: toolArgs.agentId
              };
              break;

            case 'create_game':
              let game;

              // Check if we're creating an open game
              if (toolArgs.createOpenGame) {
                game = this.gameManager.createOpenGame(toolArgs.playerId, toolArgs.playerColor);
                result = {
                  success: true,
                  message: `Open game created with ID ${game.id}. Waiting for a ${toolArgs.playerColor === 'white' ? 'black' : 'white'} player to join.`,
                  gameId: game.id
                };
              } else {
                // Create a normal game with both players specified
                game = this.gameManager.createGame(toolArgs.whitePlayerId, toolArgs.blackPlayerId);
                result = {
                  success: true,
                  message: `Game created with ID ${game.id}`,
                  gameId: game.id
                };
              }
              break;

            // Add other cases for all tools...
            default:
              throw new Error(`Unknown tool: ${toolName}`);
          }

          // Return the result in MCP format
          res.json({
            type: 'tool_call_response',
            id: body.id,
            content: [
              {
                type: 'text',
                text: JSON.stringify(result)
              }
            ]
          });
        } catch (error) {
          res.status(400).json({
            type: 'tool_call_response',
            id: body.id,
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown error'
                })
              }
            ],
            isError: true
          });
        }
      } else {
        // Unknown request type
        res.status(400).json({
          type: 'error',
          id: body.id,
          error: {
            message: `Unknown request type: ${body.type}`
          }
        });
      }
    });

    // MCP protocol endpoint for SSE transport
    this.app.get('/mcp/sse', (req, res) => {
      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Send a comment to keep the connection alive
      const keepAlive = setInterval(() => {
        res.write(': keepalive\n\n');
      }, 15000);

      // Handle client disconnect
      req.on('close', () => {
        clearInterval(keepAlive);
      });

      // Parse the initialize query parameter
      const initializeParam = req.query.initialize;
      if (initializeParam) {
        try {
          const initialize = JSON.parse(decodeURIComponent(initializeParam as string));

          // Send the initialize response
          const response = {
            type: 'initialize_response',
            id: initialize.id,
            server: {
              name: 'Chess MCP Server',
              version: '1.0.0'
            },
            capabilities: {
              tools: {
                connect_chess_platform: {
                  description: 'Connect to the chess platform with a unique agent ID',
                  parameters: {
                    type: 'object',
                    properties: {
                      agentId: {
                        type: 'string',
                        description: 'Agent ID'
                      }
                    },
                    required: ['agentId']
                  }
                },
                // Add all other tools here...
                get_all_games: {
                  description: 'Get all games on the platform',
                  parameters: {
                    type: 'object',
                    properties: {}
                  }
                }
              }
            }
          };

          res.write(`data: ${JSON.stringify(response)}\n\n`);
        } catch (error) {
          console.error('Error parsing initialize parameter:', error);
          res.write(`data: ${JSON.stringify({
            type: 'error',
            error: {
              message: 'Invalid initialize parameter'
            }
          })}\n\n`);
        }
      }

      // Handle tool calls via query parameters
      const toolCallParam = req.query.tool_call;
      if (toolCallParam) {
        try {
          const toolCall = JSON.parse(decodeURIComponent(toolCallParam as string));
          const toolName = toolCall.name;
          const toolArgs = toolCall.args;

          // Process the tool call
          let result;
          switch (toolName) {
            case 'connect_chess_platform':
              result = {
                success: true,
                message: `Agent ${toolArgs.agentId} connected to the chess platform`,
                agentId: toolArgs.agentId
              };
              break;
            // Add other tool cases here...
            default:
              throw new Error(`Unknown tool: ${toolName}`);
          }

          // Send the tool call response
          const response = {
            type: 'tool_call_response',
            id: toolCall.id,
            content: [
              {
                type: 'text',
                text: JSON.stringify(result)
              }
            ]
          };

          res.write(`data: ${JSON.stringify(response)}\n\n`);
        } catch (error) {
          console.error('Error processing tool call:', error);
          res.write(`data: ${JSON.stringify({
            type: 'error',
            error: {
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          })}\n\n`);
        }
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
