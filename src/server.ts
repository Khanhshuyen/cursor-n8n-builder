/**
 * n8n MCP Server Implementation
 * Provides MCP tools for n8n workflow management
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

import { N8nApiClient, createN8nApiClient } from './services/n8n-api-client';
import { allTools } from './tools';
import { workflowToolHandlers } from './tools/workflow-tools';
import { executionToolHandlers } from './tools/execution-tools';
import { documentationToolHandlers } from './tools/documentation-tools';
import { logger } from './utils/logger';
import { ToolResult } from './types';
import { formatErrorResponse } from './utils/errors';

export class N8nMCPServer {
  private server: Server;
  private apiClient: N8nApiClient | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'n8n-cursor-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  /**
   * Initialize n8n API client
   */
  private initializeApiClient(): N8nApiClient {
    if (!this.apiClient) {
      this.apiClient = createN8nApiClient();
    }
    return this.apiClient;
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: allTools,
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.debug(`Tool call: ${name}`, args);

      try {
        const result = await this.handleToolCall(name, args || {});
        return {
          content: result.content,
          isError: result.isError,
        };
      } catch (error) {
        logger.error(`Tool error: ${name}`, error);
        
        if (error instanceof McpError) {
          throw error;
        }

        // Use enhanced error formatting
        const errorResponse = formatErrorResponse(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(errorResponse, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Route tool calls to appropriate handlers
   */
  private async handleToolCall(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    // Documentation tools (don't require API client)
    if (name in documentationToolHandlers) {
      const handler = documentationToolHandlers[name as keyof typeof documentationToolHandlers];
      return handler(args);
    }

    // Health check doesn't require API client
    if (name === 'n8n_health_check') {
      return this.handleHealthCheck();
    }

    // All other tools require API client
    const client = this.initializeApiClient();

    // Workflow tools
    if (name in workflowToolHandlers) {
      const handler = workflowToolHandlers[name as keyof typeof workflowToolHandlers];
      return handler(client, args);
    }

    // Execution tools
    if (name in executionToolHandlers) {
      const handler = executionToolHandlers[name as keyof typeof executionToolHandlers];
      return handler(client, args);
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  /**
   * Handle health check tool
   */
  private async handleHealthCheck(): Promise<ToolResult> {
    try {
      const client = this.initializeApiClient();
      const result = await client.healthCheck();
      
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              status: result.status,
              apiUrl: process.env.N8N_API_URL,
              message: result.status === 'connected' 
                ? 'Successfully connected to n8n instance' 
                : `Connection failed: ${result.version}`,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              status: 'error',
              apiUrl: process.env.N8N_API_URL || 'Not configured',
              message: errorMessage,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      logger.error('MCP Server error:', error);
    };

    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down...');
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Start the MCP server with stdio transport
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('n8n MCP Server started');
  }
}

