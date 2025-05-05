import { RandomChessAgent } from './random-agent';
import { spawn } from 'child_process';
import path from 'path';

async function runAgents() {
  try {
    // Start the MCP server in a separate process
    console.log('Starting MCP server...');
    const mcpProcess = spawn('npm', ['run', 'mcp-server'], {
      stdio: 'pipe',
      shell: true
    });

    // Log MCP server output
    mcpProcess.stdout.on('data', (data) => {
      console.log(`MCP server: ${data}`);
    });

    mcpProcess.stderr.on('data', (data) => {
      console.error(`MCP server error: ${data}`);
    });

    // Wait for the MCP server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Create two agents
    const agent1 = new RandomChessAgent('agent1', 'npm run mcp-server');
    const agent2 = new RandomChessAgent('agent2', 'npm run mcp-server');

    // Connect both agents to the platform
    await agent1.connect();
    await agent2.connect();

    console.log('Both agents connected');

    // Agent1 creates a game against agent2
    const gameId = await agent1.createGame('agent2', true);

    console.log(`Game created with ID: ${gameId}`);

    // Start the game
    await agent1.startGame(gameId);

    console.log('Game started, agents are playing...');

    // The agents will play automatically until the game is over

    // Handle cleanup when the process exits
    process.on('SIGINT', () => {
      console.log('Shutting down...');
      mcpProcess.kill();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error running agents:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runAgents();
}
