import axios from 'axios';
import { ChessMove } from '../chess';

export class LobbyChessAgent {
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
  private async callTool(name: string, args: any): Promise<any> {
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
   * Find an available game to join
   */
  async findGame(): Promise<string | null> {
    try {
      const result = await this.callTool('find_available_game', {
        preferredColor: this.preferredColor
      });

      if (result.success && result.availableGames.length > 0) {
        // Sort games by creation date (newest first)
        const sortedGames = result.availableGames.sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Find a game that matches our preferred color
        let gameToJoin = null;

        if (this.preferredColor === 'white') {
          gameToJoin = sortedGames.find((game: any) => game.whitePlayer === '');
        } else if (this.preferredColor === 'black') {
          gameToJoin = sortedGames.find((game: any) => game.blackPlayer === '');
        } else {
          // If no color preference, take the first available game
          gameToJoin = sortedGames.find((game: any) => game.whitePlayer === '' || game.blackPlayer === '');
        }

        if (gameToJoin) {
          return gameToJoin.id;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding game:', error);
      return null;
    }
  }

  /**
   * Join an existing game
   */
  async joinGame(gameId: string): Promise<boolean> {
    try {
      // Determine which color to join as
      const gameState = await this.callTool('get_game_state', {
        gameId
      });

      if (!gameState.success) {
        return false;
      }

      const game = gameState.game;

      // Check if the game is waiting for players
      if (game.status !== 'waiting') {
        console.log(`Game ${gameId} is not waiting for players`);
        return false;
      }

      // Determine which color to join as
      let colorToJoin: 'white' | 'black';

      if (game.whitePlayer === '' && game.blackPlayer === '') {
        // Both slots are open, use preferred color
        colorToJoin = this.preferredColor === 'black' ? 'black' : 'white';
      } else if (game.whitePlayer === '') {
        colorToJoin = 'white';
      } else if (game.blackPlayer === '') {
        colorToJoin = 'black';
      } else {
        // No open slots
        console.log(`Game ${gameId} has no open slots`);
        return false;
      }

      // Join the game
      const joinResult = await this.callTool('join_game', {
        playerId: this.agentId,
        gameId,
        color: colorToJoin
      });

      if (joinResult.success) {
        console.log(`Joined game ${gameId} as ${colorToJoin}`);
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
   * Create a new open game
   */
  async createOpenGame(): Promise<string | null> {
    try {
      const result = await this.callTool('create_game', {
        createOpenGame: true,
        playerId: this.agentId,
        playerColor: this.preferredColor === 'any' ? 'white' : this.preferredColor
      });

      if (result.success) {
        console.log(`Created open game with ID ${result.gameId}`);
        this.gameId = result.gameId;
        return result.gameId;
      } else {
        console.error('Failed to create open game:', result.message);
        return null;
      }
    } catch (error) {
      console.error('Error creating open game:', error);
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
        this.isPlaying = true;
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
   * Find or create a game
   */
  async findOrCreateGame(): Promise<string | null> {
    // First, try to find an existing game
    const gameId = await this.findGame();

    if (gameId) {
      const joined = await this.joinGame(gameId);
      if (joined) {
        return gameId;
      }
    }

    // If no suitable game found or couldn't join, create a new one
    return this.createOpenGame();
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
          console.log(`Not ${this.agentId}'s turn, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        console.log(`It's ${this.agentId}'s turn!`);

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
