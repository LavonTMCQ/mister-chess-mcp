import axios from 'axios';
import { ChessMove } from '../chess';

export class RobustChessAgent {
  private agentId: string;
  private mcpUrl: string;
  private gameId: string | null = null;
  private isPlaying: boolean = false;
  private color: 'white' | 'black';
  private maxMoves: number = 50; // Limit to prevent infinite games
  private moveCount: number = 0;

  constructor(agentId: string, color: 'white' | 'black', mcpUrl: string = 'http://localhost:3001') {
    this.agentId = agentId;
    this.mcpUrl = mcpUrl;
    this.color = color;
  }

  /**
   * Call an MCP tool
   */
  async callTool(name: string, args: any): Promise<any> {
    try {
      const response = await axios.post(`${this.mcpUrl}/api/tools/call`, {
        name,
        args
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`MCP tool call failed: ${error.response.data.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Connect to the chess platform
   */
  async connect(): Promise<void> {
    const result = await this.callTool('connect_chess_platform', {
      agentId: this.agentId
    });

    console.log(`Agent ${this.agentId} connected:`, result);
  }

  /**
   * Join a specific game by ID
   */
  async joinGameById(gameId: string): Promise<boolean> {
    try {
      // Get the game state to check if the position is available
      const gameState = await this.callTool('get_game_state', {
        gameId
      });

      if (!gameState.success) {
        console.error(`Failed to get game state for ${gameId}:`, gameState.message);
        return false;
      }

      const game = gameState.game;

      // Check if the game is waiting for players or active
      if (game.status !== 'waiting' && game.status !== 'active') {
        console.log(`Game ${gameId} is not in a joinable state (status: ${game.status})`);
        return false;
      }

      // If the game is active, check if the player is already in the game
      if (game.status === 'active') {
        const isInGame =
          (this.color === 'white' && game.whitePlayer === this.agentId) ||
          (this.color === 'black' && game.blackPlayer === this.agentId);

        if (isInGame) {
          console.log(`Agent ${this.agentId} is already in game ${gameId} as ${this.color}`);
          this.gameId = gameId;
          this.isPlaying = true;
          return true;
        } else {
          console.log(`Game ${gameId} is already active and agent ${this.agentId} is not a player`);
          return false;
        }
      }

      // Check if the requested position is available
      if (this.color === 'white' && game.whitePlayer !== '') {
        console.error(`White player position is already taken by ${game.whitePlayer}`);
        return false;
      }

      if (this.color === 'black' && game.blackPlayer !== '') {
        console.error(`Black player position is already taken by ${game.blackPlayer}`);
        return false;
      }

      // Join the game
      const joinResult = await this.callTool('join_game', {
        playerId: this.agentId,
        gameId,
        color: this.color
      });

      if (joinResult.success) {
        console.log(`Joined game ${gameId} as ${this.color}`);
        this.gameId = gameId;
        return true;
      } else {
        console.error(`Failed to join game ${gameId}:`, joinResult.message);
        return false;
      }
    } catch (error) {
      console.error('Error joining game:', error);
      return false;
    }
  }

  /**
   * Create a new game
   */
  async createGame(): Promise<string | null> {
    try {
      const whitePlayerId = this.color === 'white' ? this.agentId : '';
      const blackPlayerId = this.color === 'black' ? this.agentId : '';

      const result = await this.callTool('create_game', {
        whitePlayerId,
        blackPlayerId
      });

      if (result.success) {
        console.log(`Created game with ID ${result.gameId}`);
        this.gameId = result.gameId;
        return result.gameId;
      } else {
        console.error('Failed to create game:', result.message);
        return null;
      }
    } catch (error) {
      console.error('Error creating game:', error);
      return null;
    }
  }

  /**
   * Start a game
   */
  async startGame(gameId: string): Promise<boolean> {
    try {
      const result = await this.callTool('start_game', {
        gameId
      });

      if (result.success) {
        console.log(`Game ${gameId} started`);
        this.gameId = gameId;
        return true;
      } else {
        console.error(`Failed to start game ${gameId}:`, result.message);
        return false;
      }
    } catch (error) {
      console.error('Error starting game:', error);
      return false;
    }
  }

  /**
   * Play the game until it's over
   */
  async playGame(): Promise<void> {
    if (!this.gameId) {
      console.error('No game ID specified for playGame');
      return;
    }

    // Set isPlaying to true
    this.isPlaying = true;
    this.moveCount = 0;

    // Keep checking if it's our turn and play until the game is over
    while (this.isPlaying && this.moveCount < this.maxMoves) {
      try {
        // Get the current game state
        const gameState = await this.callTool('get_game_state', {
          gameId: this.gameId
        });

        if (!gameState.success) {
          console.error('Failed to get game state:', gameState.message);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        const game = gameState.game;

        // Check if the game is over
        if (game.state.isGameOver) {
          console.log(`Game ${this.gameId} is over:`, game.result || 'No result');
          this.isPlaying = false;
          break;
        }

        // Check if it's our turn
        const isMyTurn =
          (game.state.turn === 'w' && this.color === 'white') ||
          (game.state.turn === 'b' && this.color === 'black');

        if (!isMyTurn) {
          console.log(`Not ${this.agentId}'s turn, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        console.log(`It's ${this.agentId}'s turn!`);

        // If there are no legal moves, something is wrong
        if (game.state.legalMoves.length === 0) {
          console.error('No legal moves available');
          this.isPlaying = false;
          break;
        }

        // Choose a random move
        const randomMove = this.getRandomMove(game.state.legalMoves);

        console.log(`Agent ${this.agentId} is making move:`, randomMove);

        // Make the move
        const moveResult = await this.callTool('submit_move', {
          gameId: this.gameId,
          playerId: this.agentId,
          move: randomMove
        });

        // If the move failed, log the error and try again
        if (!moveResult.success) {
          console.error('Failed to make move:', moveResult.message);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        // Increment move count
        this.moveCount++;

        // If the game is over after our move, stop playing
        if (moveResult.game.state.isGameOver) {
          console.log(`Game ${this.gameId} is over:`, moveResult.game.result || 'No result');
          this.isPlaying = false;
          break;
        }

        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error playing game:', error);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (this.moveCount >= this.maxMoves) {
      console.log(`Game ${this.gameId} reached the maximum number of moves (${this.maxMoves})`);
    }
  }

  /**
   * Choose a random move from the list of legal moves
   */
  private getRandomMove(legalMoves: ChessMove[]): ChessMove {
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    return legalMoves[randomIndex];
  }

  /**
   * Stop playing the current game
   */
  stopPlaying(): void {
    this.isPlaying = false;
  }
}
