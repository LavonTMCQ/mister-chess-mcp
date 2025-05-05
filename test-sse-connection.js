const EventSource = require('eventsource');

// Test SSE connection to the MCP server
function testSSEConnection() {
  console.log('Testing SSE connection to MCP server...');
  
  // Create initialize request
  const initializeRequest = {
    type: 'initialize',
    id: '1'
  };
  
  // Encode the initialize request as a query parameter
  const initializeParam = encodeURIComponent(JSON.stringify(initializeRequest));
  
  // Create EventSource for SSE connection
  const url = `https://mister-chess-mcp-production.up.railway.app/mcp/sse?initialize=${initializeParam}`;
  console.log(`Connecting to: ${url}`);
  
  const eventSource = new EventSource(url);
  
  // Handle connection open
  eventSource.onopen = () => {
    console.log('SSE connection opened');
  };
  
  // Handle messages
  eventSource.onmessage = (event) => {
    console.log('Received message:', event.data);
    
    try {
      const data = JSON.parse(event.data);
      
      // If we received the initialize response, make a tool call
      if (data.type === 'initialize_response') {
        console.log('Received initialize response');
        
        // Create tool call request
        const toolCallRequest = {
          type: 'tool_call',
          id: '2',
          name: 'connect_chess_platform',
          args: {
            agentId: 'test-agent'
          }
        };
        
        // Encode the tool call request as a query parameter
        const toolCallParam = encodeURIComponent(JSON.stringify(toolCallRequest));
        
        // Update the URL with the tool call parameter
        const toolCallUrl = `${url}&tool_call=${toolCallParam}`;
        console.log(`Making tool call: ${toolCallUrl}`);
        
        // Make a separate request for the tool call
        fetch(toolCallUrl)
          .then(response => {
            console.log('Tool call request sent');
          })
          .catch(error => {
            console.error('Error making tool call:', error);
          });
      }
      
      // If we received a tool call response, close the connection
      if (data.type === 'tool_call_response') {
        console.log('Received tool call response');
        console.log('Test successful!');
        
        // Close the connection
        eventSource.close();
        
        // Print connection details for Augment and Cursor
        console.log('\nConnection details for Augment:');
        console.log(JSON.stringify({
          name: 'Chess MCP Server',
          url: 'https://mister-chess-mcp-production.up.railway.app/mcp/sse',
          transport: 'sse'
        }, null, 2));
        
        console.log('\nConnection details for Cursor:');
        console.log(JSON.stringify({
          mcp_server: {
            url: 'https://mister-chess-mcp-production.up.railway.app/mcp/sse',
            transport: 'sse'
          }
        }, null, 2));
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };
  
  // Handle errors
  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    eventSource.close();
  };
}

// Run the test
testSSEConnection();
