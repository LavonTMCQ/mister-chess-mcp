import { ChessGameManager, ChessMove } from '../chess';

export function createChessMCPTools(gameManager: ChessGameManager) {
  return {
    /**
     * Connect to the chess platform
     */
    connect_chess_platform: {
      description: 'Connect to the chess platform with a unique agent ID',
      parameters: {
        type: 'object',
        properties: {
          agentId: {
            type: 'string',
            description: 'Unique identifier for the agent'
          }
        },
        required: ['agentId']
      },
      execute: async ({ agentId }: { agentId: string }) => {
        // In a real implementation, we might authenticate the agent
        return {
          success: true,
          message: `Agent ${agentId} connected to the chess platform`,
          agentId
        };
      }
    },

    /**
     * Create a new chess game
     */
    create_game: {
      description: 'Create a new chess game',
      parameters: {
        type: 'object',
        properties: {
          whitePlayerId: {
            type: 'string',
            description: 'Agent ID for the white player'
          },
          blackPlayerId: {
            type: 'string',
            description: 'Agent ID for the black player'
          }
        },
        required: ['whitePlayerId', 'blackPlayerId']
      },
      execute: async ({ whitePlayerId, blackPlayerId }: { whitePlayerId: string, blackPlayerId: string }) => {
        const game = gameManager.createGame(whitePlayerId, blackPlayerId);
        return {
          success: true,
          message: `Game created with ID ${game.id}`,
          gameId: game.id
        };
      }
    },

    /**
     * Start a chess game
     */
    start_game: {
      description: 'Start a chess game',
      parameters: {
        type: 'object',
        properties: {
          gameId: {
            type: 'string',
            description: 'ID of the game to start'
          }
        },
        required: ['gameId']
      },
      execute: async ({ gameId }: { gameId: string }) => {
        const game = gameManager.startGame(gameId);
        return {
          success: true,
          message: `Game ${gameId} started`,
          game
        };
      }
    },

    /**
     * Get the current state of a chess game
     */
    get_game_state: {
      description: 'Get the current state of a chess game',
      parameters: {
        type: 'object',
        properties: {
          gameId: {
            type: 'string',
            description: 'ID of the game'
          }
        },
        required: ['gameId']
      },
      execute: async ({ gameId }: { gameId: string }) => {
        const game = gameManager.getGame(gameId);
        return {
          success: true,
          game
        };
      }
    },

    /**
     * Submit a move in a chess game
     */
    submit_move: {
      description: 'Submit a move in a chess game',
      parameters: {
        type: 'object',
        properties: {
          gameId: {
            type: 'string',
            description: 'ID of the game'
          },
          playerId: {
            type: 'string',
            description: 'ID of the player making the move'
          },
          move: {
            type: 'object',
            description: 'The move to make',
            properties: {
              from: {
                type: 'string',
                description: 'Starting square (e.g., "e2")'
              },
              to: {
                type: 'string',
                description: 'Target square (e.g., "e4")'
              },
              promotion: {
                type: 'string',
                description: 'Piece to promote to (q, r, b, n) if move is a pawn promotion'
              }
            },
            required: ['from', 'to']
          }
        },
        required: ['gameId', 'playerId', 'move']
      },
      execute: async ({ gameId, playerId, move }: { gameId: string, playerId: string, move: ChessMove }) => {
        try {
          const game = gameManager.makeMove(gameId, playerId, move);
          return {
            success: true,
            message: `Move from ${move.from} to ${move.to} submitted`,
            game
          };
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }
    },

    /**
     * Wait for your turn in a chess game
     */
    wait_for_turn: {
      description: 'Wait for your turn in a chess game',
      parameters: {
        type: 'object',
        properties: {
          gameId: {
            type: 'string',
            description: 'ID of the game'
          },
          playerId: {
            type: 'string',
            description: 'ID of the player waiting for their turn'
          }
        },
        required: ['gameId', 'playerId']
      },
      execute: async ({ gameId, playerId }: { gameId: string, playerId: string }) => {
        const game = gameManager.getGame(gameId);

        const isPlayerTurn =
          (game.state.turn === 'w' && game.whitePlayer === playerId) ||
          (game.state.turn === 'b' && game.blackPlayer === playerId);

        return {
          success: true,
          isYourTurn: isPlayerTurn,
          game
        };
      }
    },

    /**
     * Get all games for a player
     */
    get_player_games: {
      description: 'Get all games for a player',
      parameters: {
        type: 'object',
        properties: {
          playerId: {
            type: 'string',
            description: 'ID of the player'
          }
        },
        required: ['playerId']
      },
      execute: async ({ playerId }: { playerId: string }) => {
        const games = gameManager.getPlayerGames(playerId);
        return {
          success: true,
          games
        };
      }
    }
  };
}
