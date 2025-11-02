#!/bin/bash

echo "📧 Email Reminder MCP Server - Setup Script"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Build the project
echo "🔨 Building TypeScript project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Check for credentials
if [ ! -f "credentials.json" ]; then
    echo "⚠️  credentials.json not found"
    echo ""
    echo "Next steps:"
    echo "1. Go to https://console.cloud.google.com/"
    echo "2. Create a new project (or select existing)"
    echo "3. Enable Gmail API"
    echo "4. Create OAuth 2.0 credentials (Desktop app)"
    echo "5. Download and save as credentials.json in this directory"
    echo ""
    echo "Then run this script again or proceed to configure MCP client."
else
    echo "✅ credentials.json found"
fi

echo ""
echo "📝 MCP Configuration:"
echo "Add this to your MCP client config:"
echo ""
echo "{"
echo "  \"mcpServers\": {"
echo "    \"email-reminder\": {"
echo "      \"command\": \"node\","
echo "      \"args\": [\"$(pwd)/dist/index.js\"]"
echo "    }"
echo "  }"
echo "}"
echo ""
echo "For Claude Desktop:"
echo "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "Windows: %APPDATA%\\Claude\\claude_desktop_config.json"
echo ""
echo "✨ Setup complete! Restart your MCP client to use the email reminder server."
