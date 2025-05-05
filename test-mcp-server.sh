#!/bin/bash

# Test MCP Server Connection Script
# This script tests the connection to your MCP server

# Replace this with your actual MCP server URL
MCP_SERVER_URL="https://mister-chess-mcp-production.up.railway.app:3001"

# Check if a custom URL was provided as an argument
if [ "$1" != "" ]; then
  MCP_SERVER_URL="$1"
fi

echo "=== Chess MCP Server Connection Test ==="
echo "Testing connection to: $MCP_SERVER_URL"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js to run this test."
  exit 1
fi

# Check if the test script exists
if [ ! -f "test-mcp-connection.js" ]; then
  echo "❌ test-mcp-connection.js not found. Please make sure it's in the same directory as this script."
  exit 1
fi

# Make the test script executable
chmod +x test-mcp-connection.js

# Run the test script with the MCP server URL
MCP_SERVER_URL="$MCP_SERVER_URL" node test-mcp-connection.js

# Check the exit code
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ MCP server connection test completed successfully!"
  echo ""
  echo "To connect to this MCP server using the MCP CLI, run:"
  echo "npx @modelcontextprotocol/cli connect --url $MCP_SERVER_URL --transport streamable-http"
else
  echo ""
  echo "❌ MCP server connection test failed."
fi
