const { MCPClient } = require('@modelcontextprotocol/sdk');

// Simple random move chess agent
class RandomChessAgent {
  constructor(agentId, preferredColor, mcpServerUrl) {
    this.agentId = agentId;
    this.preferredColor = preferredColor;
    this.mcpServerUrl = mcpServerUrl;
    this.client = new MCPClient({
      url: this.mcpServerUrl,
      transport: 'streamable-http'
    });
    this.gameId = null;
  }

  async connect() {
    console.log(`Agent ${this.agentId} connecting to ${this.mcpServerUrl}...`);
    
    try {
      await this.client.connect();
      
      // Connect to the chess platform
      const connectResult = await this.client.callTool('connect_chess_platform', {
        agentId: this.agentId
      });
      
      console.log(`Agent ${this.agentId} connected to chess platform: ${JSON.stringify(connectResult)}`);
      
      // Find or create a game
      await this.findOrCreateGame();
    } catch (error) {
      console.error(`Agent ${this.agentId} connection error:`, error);
    }
  }

  async findOrCreateGame() {
    try {
      // Find available games
      const findResult = await this.client.callTool('find_available_game', {});
      
      if (findResult.success && findResult.games.length > 0) {
        // Join an existing game
        const game = findResult.games[0];
        await this.joinGame(game.id);
      } else {
        // Create a new game
        await this.createGame();
      }
    } catch (error) {
      console.error(`Agent ${this.agentId} find/create game error:`, error);
    }
  }

  async createGame() {
    try {
      const createResult = await this.client.callTool('create_game', {
        createOpenGame: true,
        playerId: this.agentId,
        playerColor: this.preferredColor
      });
      
      this.gameId = createResult.gameId;
      console.log(`Agent ${this.agentId} created game ${this.gameId}`);
      
      // Wait for another player to join
      console.log(`Agent ${this.agentId} waiting for another player to join game ${this.gameId}...`);
    } catch (error) {
      console.error(`Agent ${this.agentId} create game error:`, error);
    }
  }

  async joinGame(gameId) {
    try {
      const joinResult = await this.client.callTool('join_game', {
        gameId: gameId,
        playerId: this.agentId
      });
      
      this.gameId = gameId;
      console.log(`Agent ${this.agentId} joined game ${this.gameId}`);
      
      // Start the game
      await this.client.callTool('start_game', {
        gameId: this.gameId
      });
      
      console.log(`Agent ${this.agentId} started game ${this.gameId}`);
      
      // Start playing
      await this.playGame();
    } catch (error) {
      console.error(`Agent ${this.agentId} join game error:`, error);
    }
  }

  async playGame() {
    console.log(`Agent ${this.agentId} starting to play game ${this.gameId}`);
    
    try {
      while (true) {
        // Wait for turn
        console.log(`Agent ${this.agentId} waiting for turn in game ${this.gameId}...`);
        
        const waitResult = await this.client.callTool('wait_for_turn', {
          gameId: this.gameId,
          playerId: this.agentId
        });
        
        if (!waitResult.success) {
          console.log(`Agent ${this.agentId} game ${this.gameId} ended: ${JSON.stringify(waitResult)}`);
          break;
        }
        
        console.log(`Agent ${this.agentId} turn in game ${this.gameId}`);
        
        // Get game state
        const stateResult = await this.client.callTool('get_game_state', {
          gameId: this.gameId
        });
        
        const game = stateResult.game;
        
        // Make a random move
        const legalMoves = game.state.legalMoves;
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        
        console.log(`Agent ${this.agentId} making move ${JSON.stringify(randomMove)} in game ${this.gameId}`);
        
        await this.client.callTool('submit_move', {
          gameId: this.gameId,
          playerId: this.agentId,
          move: randomMove
        });
      }
    } catch (error) {
      console.error(`Agent ${this.agentId} play game error:`, error);
    }
  }
}

// Create and connect two agents
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';

console.log(`Connecting agents to MCP server: ${MCP_SERVER_URL}`);

const agent1 = new RandomChessAgent('agent1', 'white', MCP_SERVER_URL);
const agent2 = new RandomChessAgent('agent2', 'black', MCP_SERVER_URL);

// Connect agents with a slight delay between them
agent1.connect().catch(console.error);

setTimeout(() => {
  agent2.connect().catch(console.error);
}, 2000);
