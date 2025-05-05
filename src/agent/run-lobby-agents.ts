import { LobbyChessAgent } from './lobby-agent';

async function runAgents() {
  try {
    // Create agents with different color preferences
    const agent1 = new LobbyChessAgent('agent3', 'white');
    const agent2 = new LobbyChessAgent('agent4', 'black');

    // Connect both agents to the platform
    await agent1.connect();
    await agent2.connect();

    console.log('Both agents connected');

    // Agent1 creates an open game
    const gameId = await agent1.createOpenGame();

    if (gameId) {
      console.log(`Agent1 created open game with ID: ${gameId}`);

      // Wait a bit before agent2 tries to join
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Agent2 finds and joins the game
      const joined = await agent2.joinGame(gameId);

      if (joined) {
        console.log(`Agent2 joined game ${gameId}`);
        console.log('Game is now in progress...');

        // Start both agents playing
        agent1.playGame();
        agent2.playGame();

        // Keep the process running to allow the agents to play
        console.log('Agents are playing. Press Ctrl+C to stop.');
      } else {
        console.error('Agent2 failed to join the game');
      }
    } else {
      console.error('Failed to create open game');
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

// Only run if this file is executed directly
if (require.main === module) {
  runAgents();
}
