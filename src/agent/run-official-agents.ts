import { OfficialChessAgent } from './official-agent';
import { spawn } from 'child_process';

async function runAgents() {
  try {
    // Start the MCP server in a separate process
    console.log('Starting MCP server...');
    const mcpProcess = spawn('npm', ['run', 'mcp-official'], {
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
    const agent1 = new OfficialChessAgent('agent1');
    const agent2 = new OfficialChessAgent('agent2');
    
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
    
    // Handle cleanup when the process exits
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      await agent1.close();
      await agent2.close();
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
