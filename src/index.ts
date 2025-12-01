#!/usr/bin/env node
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as os from 'os';

dotenv.config();

const args = process.argv.slice(2);
const command = args[0];

if (command === '--help' || command === '-h' || command === 'help') {
  console.log(`
╔═══════════════════════════════════════════╗
║       Cursor n8n MCP Server               ║
╚═══════════════════════════════════════════╝

Usage:
  cursor-n8n-mcp              Start MCP server
  cursor-n8n-mcp setup        Interactive setup
  cursor-n8n-mcp config       Show configuration template
  cursor-n8n-mcp help         Show this help message

Environment Variables:
  N8N_API_URL     n8n instance URL (required)
  N8N_API_KEY     n8n API key (required)
  LOG_LEVEL       Log level (debug, info, warn, error)
`);
  process.exit(0);
}

if (command === 'config') {
  const config = {
    mcpServers: {
      'cursor-n8n-mcp': {
        command: 'node',
        args: ['/path/to/cursor-n8n-mcp/dist/index.js'],
        env: {
          MCP_MODE: 'stdio',
          LOG_LEVEL: 'error',
          N8N_API_URL: 'YOUR_N8N_URL',
          N8N_API_KEY: 'YOUR_API_KEY',
        },
      },
    },
  };
  console.log('\nCursor MCP Configuration (.cursor/mcp.json):\n');
  console.log(JSON.stringify(config, null, 2));
  console.log('\nCopy this configuration to .cursor/mcp.json');
  console.log('Replace N8N_API_URL and N8N_API_KEY with your values.\n');
  process.exit(0);
}

if (command === 'setup') {
  runSetup();
} else {
  startServer();
}

async function runSetup(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => resolve(answer.trim()));
    });
  };

  console.log('\n\x1b[34m╔═══════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[34m║     Cursor n8n MCP Server Setup           ║\x1b[0m');
  console.log('\x1b[34m╚═══════════════════════════════════════════╝\x1b[0m\n');

  try {
    console.log('\x1b[33mEnter your n8n API credentials:\x1b[0m\n');

    const n8nUrl = await question('n8n URL (e.g., https://n8n.example.com): ');
    if (!n8nUrl) {
      console.log('\x1b[31m✗ n8n URL is required!\x1b[0m');
      rl.close();
      process.exit(1);
    }

    const n8nApiKey = await question('n8n API Key: ');
    if (!n8nApiKey) {
      console.log('\x1b[31m✗ API key is required!\x1b[0m');
      rl.close();
      process.exit(1);
    }

    const distPath = path.resolve(__dirname, 'index.js');
    
    const config = {
      mcpServers: {
        'cursor-n8n-mcp': {
          command: 'node',
          args: [distPath],
          env: {
            MCP_MODE: 'stdio',
            LOG_LEVEL: 'error',
            N8N_API_URL: n8nUrl.replace(/\/$/, ''),
            N8N_API_KEY: n8nApiKey,
          },
        },
      },
    };

    console.log('\n\x1b[33mSelect configuration type:\x1b[0m');
    console.log('  1) Global (All Cursor projects)');
    console.log('  2) Project-based (Current directory .cursor/mcp.json)');

    const configType = (await question('Your choice (1/2) [1]: ')) || '1';

    let configPath: string;

    if (configType === '2') {
      const cursorDir = path.join(process.cwd(), '.cursor');
      if (!fs.existsSync(cursorDir)) {
        fs.mkdirSync(cursorDir, { recursive: true });
      }
      configPath = path.join(cursorDir, 'mcp.json');
    } else {
      const globalDir = path.join(os.homedir(), '.cursor');
      if (!fs.existsSync(globalDir)) {
        fs.mkdirSync(globalDir, { recursive: true });
      }
      configPath = path.join(globalDir, 'mcp.json');
    }

    let existingConfig: Record<string, unknown> = {};
    if (fs.existsSync(configPath)) {
      console.log(`\n\x1b[33m⚠ Existing configuration found: ${configPath}\x1b[0m`);
      const content = fs.readFileSync(configPath, 'utf-8');
      try {
        existingConfig = JSON.parse(content);
      } catch {
        existingConfig = {};
      }
      
      const overwrite = (await question('Merge with existing config? (y/n) [y]: ')) || 'y';
      if (overwrite.toLowerCase() !== 'y') {
        console.log('\x1b[33mSetup cancelled.\x1b[0m');
        rl.close();
        return;
      }
    }

    const mergedConfig = {
      ...existingConfig,
      mcpServers: {
        ...((existingConfig.mcpServers as Record<string, unknown>) || {}),
        ...config.mcpServers,
      },
    };

    fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');
    console.log(`\n\x1b[32m✓ Configuration saved: ${configPath}\x1b[0m`);

    console.log('\n\x1b[32m═══════════════════════════════════════════\x1b[0m');
    console.log('\x1b[32m  ✓ Setup Complete!\x1b[0m');
    console.log('\x1b[32m═══════════════════════════════════════════\x1b[0m\n');

    console.log('\x1b[34mNext steps:\x1b[0m');
    console.log('  1. Completely close Cursor');
    console.log('  2. Reopen Cursor');
    console.log('  3. Open a new chat and type: "Check n8n connection"');

    console.log('\n\x1b[34mExample commands:\x1b[0m');
    console.log('  • "List all workflows in n8n"');
    console.log('  • "Create a new webhook workflow"');
    console.log('  • "Activate workflow XYZ"\n');

    rl.close();
  } catch (error) {
    console.error('\x1b[31mSetup error:\x1b[0m', error);
    rl.close();
    process.exit(1);
  }
}

async function startServer(): Promise<void> {
  const { N8nMCPServer } = await import('./server');
  const { logger } = await import('./utils/logger');

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
    process.exit(1);
  });

  try {
    const server = new N8nMCPServer();
    await server.run();
  } catch (error) {
    logger.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}
