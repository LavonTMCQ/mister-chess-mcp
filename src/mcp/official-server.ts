import { Server } from '@modelcontextprotocol/sdk/server';
import { ChessGameManager, ChessMove } from '../chess';

export class ChessMCPOfficialServer {
  private server: Server;
  private gameManager: ChessGameManager;

  constructor() {
    this.gameManager = new ChessGameManager();
    
    // Create MCP server
    this.server = new Server({
      name: "Chess MCP Server",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    // Set up tools
    this.setupTools();
  }
  
  /**
   * Set up MCP tools
   */
  private setupTools(): void {
    // Define available tools
    this.server.setRequestHandler({
      method: "tools/list",
      params: {}
    }, async () => {
      return {
        tools: [
          {
            name: "connect_chess_platform",
            description: "Connect to the chess platform with a unique agent ID",
            inputSchema: {
              type: "object",
              properties: {
                agentId: {
                  type: "string",
                  description: "Unique identifier for the agent"
                }
              },
              required: ["agentId"]
            }
          },
          {
            name: "create_game",
            description: "Create a new chess game",
            inputSchema: {
              type: "object",
              properties: {
                whitePlayerId: {
                  type: "string",
                  description: "Agent ID for the white player"
                },
                blackPlayerId: {
                  type: "string",
                  description: "Agent ID for the black player"
                }
              },
              required: ["whitePlayerId", "blackPlayerId"]
            }
          },
          {
            name: "start_game",
            description: "Start a chess game",
            inputSchema: {
              type: "object",
              properties: {
                gameId: {
                  type: "string",
                  description: "ID of the game to start"
                }
              },
              required: ["gameId"]
            }
          },
          {
            name: "get_game_state",
            description: "Get the current state of a chess game",
            inputSchema: {
              type: "object",
              properties: {
                gameId: {
                  type: "string",
                  description: "ID of the game"
                }
              },
              required: ["gameId"]
            }
          },
          {
            name: "submit_move",
            description: "Submit a move in a chess game",
            inputSchema: {
              type: "object",
              properties: {
                gameId: {
                  type: "string",
                  description: "ID of the game"
                },
                playerId: {
                  type: "string",
                  description: "ID of the player making the move"
                },
                move: {
                  type: "object",
                  description: "The move to make",
                  properties: {
                    from: {
                      type: "string",
                      description: "Starting square (e.g., 'e2')"
                    },
                    to: {
                      type: "string",
                      description: "Target square (e.g., 'e4')"
                    },
                    promotion: {
                      type: "string",
                      description: "Piece to promote to (q, r, b, n) if move is a pawn promotion"
                    }
                  },
                  required: ["from", "to"]
                }
              },
              required: ["gameId", "playerId", "move"]
            }
          },
          {
            name: "wait_for_turn",
            description: "Wait for your turn in a chess game",
            inputSchema: {
              type: "object",
              properties: {
                gameId: {
                  type: "string",
                  description: "ID of the game"
                },
                playerId: {
                  type: "string",
                  description: "ID of the player waiting for their turn"
                }
              },
              required: ["gameId", "playerId"]
            }
          },
          {
            name: "get_player_games",
            description: "Get all games for a player",
            inputSchema: {
              type: "object",
              properties: {
                playerId: {
                  type: "string",
                  description: "ID of the player"
                }
              },
              required: ["playerId"]
            }
          }
        ]
      };
    });
    
    // Handle tool execution
    this.server.setRequestHandler({
      method: "tools/call",
      params: {
        name: "",
        arguments: {}
      }
    }, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        let result;
        
        switch (name) {
          case "connect_chess_platform":
            result = {
              success: true,
              message: `Agent ${args.agentId} connected to the chess platform`,
              agentId: args.agentId
            };
            break;
            
          case "create_game":
            const game = this.gameManager.createGame(args.whitePlayerId, args.blackPlayerId);
            result = {
              success: true,
              message: `Game created with ID ${game.id}`,
              gameId: game.id
            };
            break;
            
          case "start_game":
            const startedGame = this.gameManager.startGame(args.gameId);
            result = {
              success: true,
              message: `Game ${args.gameId} started`,
              game: startedGame
            };
            break;
            
          case "get_game_state":
            const gameState = this.gameManager.getGame(args.gameId);
            result = {
              success: true,
              game: gameState
            };
            break;
            
          case "submit_move":
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
            
          case "wait_for_turn":
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
            
          case "get_player_games":
            const playerGames = this.gameManager.getPlayerGames(args.playerId);
            result = {
              success: true,
              games: playerGames
            };
            break;
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ]
        };
      }
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    // Start the MCP server in stdio mode
    await this.server.connect({
      start: async () => {},
      send: async (message) => {
        console.log('Sending message:', JSON.stringify(message));
        process.stdout.write(JSON.stringify(message) + '\n');
      },
      close: async () => {},
      onmessage: (message) => {
        console.log('Received message:', JSON.stringify(message));
      }
    });
    
    console.log('Chess MCP server started in stdio mode');
    
    // Set up stdin handling
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data) => {
      try {
        const messages = data.toString().trim().split('\n');
        for (const message of messages) {
          if (message) {
            const parsedMessage = JSON.parse(message);
            this.server.receive(parsedMessage);
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
  }

  /**
   * Get the game manager
   */
  getGameManager(): ChessGameManager {
    return this.gameManager;
  }
}
