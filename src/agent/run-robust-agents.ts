import { RobustChessAgent } from './robust-agent';

async function runAgents() {
  try {
    // Create agents with different colors
    const whiteAgent = new RobustChessAgent('agent7', 'white');
    const blackAgent = new RobustChessAgent('agent8', 'black');

    // Connect both agents to the platform
    await whiteAgent.connect();
    await blackAgent.connect();

    console.log('Both agents connected');

    // White agent creates a game
    const gameId = await whiteAgent.createGame();

    if (gameId) {
      console.log(`White agent created game with ID: ${gameId}`);

      // Wait a bit before black agent tries to join
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Black agent joins the game
      const joined = await blackAgent.joinGameById(gameId);

      if (joined) {
        console.log(`Black agent joined game ${gameId}`);

        // Get the game state to check if it's already active
        const gameState = await whiteAgent.callTool('get_game_state', {
          gameId
        });

        let canProceed = false;

        if (gameState.game.status === 'active') {
          console.log(`Game ${gameId} is already active, proceeding to play`);
          canProceed = true;
        } else {
          // Start the game
          const started = await whiteAgent.startGame(gameId);

          if (started) {
            console.log(`Game ${gameId} started successfully`);
            canProceed = true;
          } else {
            console.error('Failed to start the game');
          }
        }

        if (canProceed) {
          // Start both agents playing
          console.log('Game is now in progress...');
          console.log('Agents are playing. Press Ctrl+C to stop.');

          // Start both agents playing concurrently
          await Promise.all([
            whiteAgent.playGame(),
            blackAgent.playGame()
          ]);

          console.log('Game completed!');
        }
      } else {
        console.error('Black agent failed to join the game');
      }
    } else {
      console.error('Failed to create game');
    }

    // Handle cleanup when the process exits
    process.on('SIGINT', () => {
      console.log('Shutting down...');
      whiteAgent.stopPlaying();
      blackAgent.stopPlaying();
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
