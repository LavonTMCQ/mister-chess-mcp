import { MCPClient } from '@mastra/mcp';
import { ChessMove } from '../chess';

export class RandomChessAgent {
  private client: MCPClient;
  private agentId: string;
  private gameId: string | null = null;
  private isPlaying: boolean = false;

  constructor(agentId: string, mcpCommand: string = 'npm run mcp-server') {
    this.agentId = agentId;
    this.client = new MCPClient({
      servers: {
        chess: {
          command: mcpCommand,
          args: []
        }
      }
    });
  }

  /**
   * Connect to the chess platform
   */
  async connect(): Promise<void> {
    // Get the toolsets from the MCP client
    const toolsets = await this.client.getToolsets();

    // Call the connect_chess_platform tool
    const result = await toolsets.chess.connect_chess_platform({
      agentId: this.agentId
    });

    console.log(`Agent ${this.agentId} connected:`, result);
  }

  /**
   * Create a new game against another agent
   */
  async createGame(opponentId: string, playAsWhite: boolean = true): Promise<string> {
    const whitePlayerId = playAsWhite ? this.agentId : opponentId;
    const blackPlayerId = playAsWhite ? opponentId : this.agentId;

    // Get the toolsets from the MCP client
    const toolsets = await this.client.getToolsets();

    // Call the create_game tool
    const result = await toolsets.chess.create_game({
      whitePlayerId,
      blackPlayerId
    });

    this.gameId = result.gameId;
    console.log(`Game created with ID ${this.gameId}`);

    return this.gameId as string;
  }

  /**
   * Start a game
   */
  async startGame(gameId?: string): Promise<void> {
    const id = gameId || this.gameId;

    if (!id) {
      throw new Error('No game ID specified');
    }

    // Get the toolsets from the MCP client
    const toolsets = await this.client.getToolsets();

    // Call the start_game tool
    const result = await toolsets.chess.start_game({
      gameId: id
    });

    console.log(`Game ${id} started:`, result);

    // If this is our game, start playing
    if (id === this.gameId) {
      this.isPlaying = true;
      this.playGame();
    }
  }

  /**
   * Play the game until it's over
   */
  private async playGame(): Promise<void> {
    if (!this.gameId || !this.isPlaying) {
      return;
    }

    // Keep checking if it's our turn and play until the game is over
    while (this.isPlaying) {
      try {
        // Get the toolsets from the MCP client
        const toolsets = await this.client.getToolsets();

        // Wait for our turn
        const turnResult = await toolsets.chess.wait_for_turn({
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
        const stateResult = await toolsets.chess.get_game_state({
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
        const moveResult = await toolsets.chess.submit_move({
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
