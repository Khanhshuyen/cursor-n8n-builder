/**
 * Execution Management Tools
 * MCP tools for n8n execution operations and webhook triggers
 */

import { ToolDefinition, ToolResult } from '../types';
import { N8nApiClient } from '../services/n8n-api-client';

// ============================================================================
// Tool Definitions
// ============================================================================

export const executionTools: ToolDefinition[] = [
  {
    name: 'n8n_list_executions',
    description: 'List workflow executions. Can filter by workflow ID and status.',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'Filter executions by workflow ID',
        },
        status: {
          type: 'string',
          enum: ['success', 'error', 'waiting'],
          description: 'Filter by execution status',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of executions to return (default: 20)',
        },
        includeData: {
          type: 'boolean',
          description: 'Include execution data in response (default: false)',
        },
      },
    },
  },
  {
    name: 'n8n_get_execution',
    description: 'Get detailed information about a specific execution including input/output data.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The execution ID',
        },
        includeData: {
          type: 'boolean',
          description: 'Include full execution data (default: true)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_delete_execution',
    description: 'Delete an execution record.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The execution ID to delete',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_trigger_webhook',
    description: 'Trigger a workflow via its webhook URL. The workflow must be active and have a Webhook trigger node.',
    inputSchema: {
      type: 'object',
      properties: {
        webhookUrl: {
          type: 'string',
          description: 'Full webhook URL (e.g., https://n8n.example.com/webhook/xxx-xxx-xxx)',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE'],
          description: 'HTTP method (default: POST)',
        },
        data: {
          type: 'object',
          description: 'Data to send with the webhook request',
        },
        headers: {
          type: 'object',
          description: 'Additional HTTP headers',
        },
      },
      required: ['webhookUrl'],
    },
  },
  {
    name: 'n8n_health_check',
    description: 'Check the connection to the n8n instance and verify API credentials.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

export const executionToolHandlers = {
  n8n_list_executions: async (
    client: N8nApiClient,
    args: Record<string, unknown>
  ): Promise<ToolResult> => {
    const result = await client.listExecutions({
      workflowId: args.workflowId as string | undefined,
      status: args.status as 'success' | 'error' | 'waiting' | undefined,
      limit: (args.limit as number) || 20,
      includeData: args.includeData as boolean | undefined,
    });

    const executions = result.data.map((e) => ({
      id: e.id,
      workflowId: e.workflowId,
      status: e.status,
      mode: e.mode,
      startedAt: e.startedAt,
      stoppedAt: e.stoppedAt,
      finished: e.finished,
    }));

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            count: executions.length,
            executions,
            hasMore: !!result.nextCursor,
          }, null, 2),
        },
      ],
    };
  },

  n8n_get_execution: async (
    client: N8nApiClient,
    args: Record<string, unknown>
  ): Promise<ToolResult> => {
    const id = args.id as string;
    if (!id) {
      throw new Error('Execution ID is required');
    }

    const includeData = args.includeData !== false; // default true
    const execution = await client.getExecution(id, includeData);

    const response: Record<string, unknown> = {
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      mode: execution.mode,
      startedAt: execution.startedAt,
      stoppedAt: execution.stoppedAt,
      finished: execution.finished,
    };

    if (includeData && execution.data) {
      response.data = execution.data;
    }

    if (execution.data?.resultData?.error) {
      response.error = execution.data.resultData.error;
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  },

  n8n_delete_execution: async (
    client: N8nApiClient,
    args: Record<string, unknown>
  ): Promise<ToolResult> => {
    const id = args.id as string;
    if (!id) {
      throw new Error('Execution ID is required');
    }

    await client.deleteExecution(id);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: `Execution ${id} deleted successfully`,
          }, null, 2),
        },
      ],
    };
  },

  n8n_trigger_webhook: async (
    client: N8nApiClient,
    args: Record<string, unknown>
  ): Promise<ToolResult> => {
    const webhookUrl = args.webhookUrl as string;
    if (!webhookUrl) {
      throw new Error('Webhook URL is required');
    }

    const result = await client.triggerWebhook(webhookUrl, {
      method: (args.method as 'GET' | 'POST' | 'PUT' | 'DELETE') || 'POST',
      data: args.data as Record<string, unknown> | undefined,
      headers: args.headers as Record<string, string> | undefined,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'Webhook triggered successfully',
            response: result,
          }, null, 2),
        },
      ],
    };
  },
};

