import axios from 'axios';
import { ChessMove } from '../chess';

export class GameIdChessAgent {
  private agentId: string;
  private mcpUrl: string;
  private gameId: string | null = null;
  private isPlaying: boolean = false;
  private preferredColor: 'white' | 'black' | 'any';

  constructor(agentId: string, preferredColor: 'white' | 'black' | 'any' = 'any', mcpUrl: string = 'http://localhost:3001') {
    this.agentId = agentId;
    this.mcpUrl = mcpUrl;
    this.preferredColor = preferredColor;
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
  async joinGameById(gameId: string, color: 'white' | 'black'): Promise<boolean> {
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

      // Check if the game is waiting for players
      if (game.status !== 'waiting') {
        console.log(`Game ${gameId} is not waiting for players`);
        return false;
      }

      // Check if the requested position is available
      if (color === 'white' && game.whitePlayer !== '') {
        console.error(`White player position is already taken by ${game.whitePlayer}`);
        return false;
      }

      if (color === 'black' && game.blackPlayer !== '') {
        console.error(`Black player position is already taken by ${game.blackPlayer}`);
        return false;
      }

      // Join the game
      const joinResult = await this.callTool('join_game', {
        playerId: this.agentId,
        gameId,
        color
      });

      if (joinResult.success) {
        console.log(`Joined game ${gameId} as ${color}`);
        this.gameId = gameId;

        // If the game is now active, start playing
        if (joinResult.game.status === 'active') {
          this.isPlaying = true;
          this.playGame();
        }

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
   * Play the game until it's over
   */
  async playGame(): Promise<void> {
    if (!this.gameId) {
      console.error('No game ID specified for playGame');
      return;
    }

    // Set isPlaying to true
    this.isPlaying = true;

    // Keep checking if it's our turn and play until the game is over
    while (this.isPlaying) {
      try {
        // Wait for our turn
        const turnResult = await this.callTool('wait_for_turn', {
          gameId: this.gameId,
          playerId: this.agentId
        });

        // If the game is over, stop playing
        if (turnResult.game.state.isGameOver) {
          console.log(`Game ${this.gameId} is over:`, turnResult.game.result);
          this.isPlaying = false;
          break;
        }

        // If it's not our turn, wait a bit and check again
        if (!turnResult.isYourTurn) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // Get the game state
        const stateResult = await this.callTool('get_game_state', {
          gameId: this.gameId
        });

        const game = stateResult.game;

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

        // If the move failed, log the error and stop playing
        if (!moveResult.success) {
          console.error('Failed to make move:', moveResult.message);
          this.isPlaying = false;
          break;
        }

        // If the game is over after our move, stop playing
        if (moveResult.game.state.isGameOver) {
          console.log(`Game ${this.gameId} is over:`, moveResult.game.result);
          this.isPlaying = false;
          break;
        }

        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error playing game:', error);
        this.isPlaying = false;
        break;
      }
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
