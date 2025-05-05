import { Client } from '@modelcontextprotocol/sdk/client';
import { ChessMove } from '../chess';
import { spawn, ChildProcess } from 'child_process';

export class OfficialChessAgent {
  private client: Client;
  private agentId: string;
  private gameId: string | null = null;
  private isPlaying: boolean = false;
  private mcpProcess: ChildProcess | null = null;

  constructor(agentId: string, mcpCommand: string = 'npm run mcp-official') {
    this.agentId = agentId;
    
    // Create MCP client
    this.client = new Client({
      name: "Chess Agent",
      version: "1.0.0"
    }, {
      capabilities: {}
    });
    
    // Start the MCP server process
    this.mcpProcess = spawn(mcpCommand, [], {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Set up process event handlers
    if (this.mcpProcess.stdout) {
      this.mcpProcess.stdout.on('data', (data) => {
        const messages = data.toString().trim().split('\n');
        for (const message of messages) {
          if (message) {
            try {
              const parsedMessage = JSON.parse(message);
              this.client.receive(parsedMessage);
            } catch (error) {
              console.error('Error parsing message:', error);
            }
          }
        }
      });
    }
    
    if (this.mcpProcess.stderr) {
      this.mcpProcess.stderr.on('data', (data) => {
        console.error(`MCP server error: ${data}`);
      });
    }
    
    this.mcpProcess.on('close', (code) => {
      console.log(`MCP server process exited with code ${code}`);
    });
  }

  /**
   * Connect to the chess platform
   */
  async connect(): Promise<void> {
    // Connect to the MCP server
    await this.client.connect({
      start: async () => {},
      send: async (message) => {
        if (this.mcpProcess && this.mcpProcess.stdin) {
          this.mcpProcess.stdin.write(JSON.stringify(message) + '\n');
        }
      },
      close: async () => {
        if (this.mcpProcess) {
          this.mcpProcess.kill();
        }
      },
      onmessage: (message) => {
        // Message handling is done in the stdout event handler
      }
    });
    
    // Initialize the client
    await this.client.initialize();
    
    // Call the connect_chess_platform tool
    const result = await this.callTool('connect_chess_platform', {
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
    
    // Call the create_game tool
    const result = await this.callTool('create_game', {
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
    
    // Call the start_game tool
    const result = await this.callTool('start_game', {
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

  /**
   * Call an MCP tool and parse the result
   */
  private async callTool(name: string, args: any): Promise<any> {
    const response = await this.client.callTool(name, args);
    
    if (response.isError) {
      throw new Error(response.content[0].text);
    }
    
    return JSON.parse(response.content[0].text);
  }

  /**
   * Close the agent and clean up resources
   */
  async close(): Promise<void> {
    this.stopPlaying();
    
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = null;
    }
    
    await this.client.shutdown();
  }
}
