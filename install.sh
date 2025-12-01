#!/bin/bash

#############################################
# n8n Cursor MCP Server - Installation Script
#############################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logo
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║     n8n Cursor MCP Server Installation    ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 1. Node.js check
echo ""
print_info "Checking Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js not found!"
    echo "Please install Node.js 18+: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ required. Current: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) found"

# 2. Yarn/npm check
print_info "Checking package manager..."
if command -v yarn &> /dev/null; then
    PKG_MANAGER="yarn"
    print_success "Yarn found"
else
    PKG_MANAGER="npm"
    print_success "Using npm"
fi

# 3. Install dependencies
echo ""
print_info "Installing dependencies..."
if [ "$PKG_MANAGER" = "yarn" ]; then
    yarn install --silent
else
    npm install --silent
fi
print_success "Dependencies installed"

# 4. Build TypeScript
print_info "Building project..."
if [ "$PKG_MANAGER" = "yarn" ]; then
    yarn build
else
    npm run build
fi
print_success "Project built"

# 5. Get user input
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Enter your n8n API credentials           ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""

read -p "Your n8n URL (e.g., https://n8n.example.com): " N8N_URL
read -p "Your n8n API Key: " N8N_API_KEY

# Remove trailing slash from URL
N8N_URL="${N8N_URL%/}"

# 6. Select configuration type
echo ""
echo "Select configuration type:"
echo "  1) Global (Available in all Cursor projects)"
echo "  2) Project-based (Only for this project)"
read -p "Your choice (1/2): " CONFIG_TYPE

# 7. Create MCP configuration
DIST_PATH="$SCRIPT_DIR/dist/index.js"

MCP_CONFIG=$(cat <<EOF
{
  "mcpServers": {
    "n8n-cursor-mcp": {
      "command": "node",
      "args": ["$DIST_PATH"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "N8N_API_URL": "$N8N_URL",
        "N8N_API_KEY": "$N8N_API_KEY"
      }
    }
  }
}
EOF
)

if [ "$CONFIG_TYPE" = "1" ]; then
    # Global configuration - ~/.cursor/mcp.json
    CONFIG_DIR="$HOME/.cursor"
    mkdir -p "$CONFIG_DIR"
    CONFIG_FILE="$CONFIG_DIR/mcp.json"
    
    # Check existing configuration
    if [ -f "$CONFIG_FILE" ]; then
        print_warning "Existing MCP configuration found: $CONFIG_FILE"
        read -p "Overwrite? (y/n): " OVERWRITE
        if [ "$OVERWRITE" != "y" ]; then
            print_info "Installation cancelled"
            exit 0
        fi
    fi
    
    echo "$MCP_CONFIG" > "$CONFIG_FILE"
    print_success "Global MCP configuration created: $CONFIG_FILE"
else
    # Project-based configuration
    mkdir -p "$SCRIPT_DIR/.cursor"
    echo "$MCP_CONFIG" > "$SCRIPT_DIR/.cursor/mcp.json"
    print_success "Project MCP configuration created: $SCRIPT_DIR/.cursor/mcp.json"
fi

# 8. Complete
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ Installation Complete!                 ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
print_info "Next steps:"
echo "  1. Completely close Cursor"
echo "  2. Reopen Cursor"
echo "  3. Open a new chat and type: 'Check n8n connection'"
echo ""
print_info "Example commands:"
echo "  • 'List all workflows in n8n'"
echo "  • 'Create a new webhook workflow'"
echo "  • 'Activate workflow XYZ'"
echo ""
