import { GameIdChessAgent } from './game-id-agent';

async function runAgents(gameId: string) {
  try {
    // Create agents with different color preferences
    const agent1 = new GameIdChessAgent('agent5', 'white');
    const agent2 = new GameIdChessAgent('agent6', 'black');

    // Connect both agents to the platform
    await agent1.connect();
    await agent2.connect();

    console.log('Both agents connected');

    // Agent1 joins as white
    const agent1Joined = await agent1.joinGameById(gameId, 'white');

    if (agent1Joined) {
      console.log(`Agent1 joined game ${gameId} as white`);

      // Wait a bit before agent2 tries to join
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Agent2 joins as black
      const agent2Joined = await agent2.joinGameById(gameId, 'black');

      if (agent2Joined) {
        console.log(`Agent2 joined game ${gameId} as black`);

        // Start the game
        try {
          const startResult = await agent1.callTool('start_game', { gameId });
          if (startResult.success) {
            console.log(`Game ${gameId} started successfully`);

            // Start both agents playing
            agent1.playGame();
            agent2.playGame();

            console.log('Game is now in progress...');
            console.log('Agents are playing. Press Ctrl+C to stop.');
          } else {
            console.error('Failed to start game:', startResult.message);
          }
        } catch (error) {
          console.error('Error starting game:', error);
        }
      } else {
        console.error('Agent2 failed to join the game');
      }
    } else {
      console.error('Agent1 failed to join the game');
    }

    // Handle cleanup when the process exits
    process.on('SIGINT', () => {
      console.log('Shutting down...');
      agent1.stopPlaying();
      agent2.stopPlaying();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error running agents:', error);
  }
}

// Get the game ID from command line arguments
const gameId = process.argv[2];

if (!gameId) {
  console.error('Please provide a game ID as a command line argument');
  process.exit(1);
}

// Run the agents
runAgents(gameId);
