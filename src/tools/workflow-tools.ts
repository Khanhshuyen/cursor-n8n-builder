/**
 * Workflow Management Tools
 * MCP tools for n8n workflow CRUD operations
 */

import { ToolDefinition, ToolResult, N8nNode, N8nConnections, N8nWorkflowSettings } from '../types';
import { N8nApiClient } from '../services/n8n-api-client';

// ============================================================================
// Tool Definitions
// ============================================================================

export const workflowTools: ToolDefinition[] = [
  {
    name: 'n8n_list_workflows',
    description: 'List all workflows in the n8n instance. Returns workflow IDs, names, and active status.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of workflows to return (default: 100)',
        },
        active: {
          type: 'boolean',
          description: 'Filter by active status (true/false)',
        },
      },
    },
  },
  {
    name: 'n8n_get_workflow',
    description: 'Get detailed information about a specific workflow including all nodes and connections.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The workflow ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_create_workflow',
    description: 'Create a new workflow with nodes and connections. The workflow will be created in inactive state.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the workflow',
        },
        nodes: {
          type: 'array',
          description: 'Array of node objects. Each node needs: id, name, type, typeVersion, position [x,y], parameters',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string', description: 'e.g., "n8n-nodes-base.webhook", "n8n-nodes-base.httpRequest"' },
              typeVersion: { type: 'number' },
              position: { type: 'array', items: { type: 'number' } },
              parameters: { type: 'object' },
            },
            required: ['id', 'name', 'type', 'typeVersion', 'position', 'parameters'],
          },
        },
        connections: {
          type: 'object',
          description: 'Connection mapping between nodes. Format: { "sourceNode": { "main": [[{ "node": "targetNode", "type": "main", "index": 0 }]] } }',
        },
        settings: {
          type: 'object',
          description: 'Optional workflow settings',
          properties: {
            executionOrder: { type: 'string', enum: ['v0', 'v1'] },
            timezone: { type: 'string' },
          },
        },
      },
      required: ['name', 'nodes', 'connections'],
    },
  },
  {
    name: 'n8n_update_workflow',
    description: 'Update an existing workflow. You can update name, nodes, connections, or settings.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The workflow ID to update',
        },
        name: {
          type: 'string',
          description: 'New name for the workflow',
        },
        nodes: {
          type: 'array',
          description: 'Updated array of nodes (replaces all existing nodes)',
        },
        connections: {
          type: 'object',
          description: 'Updated connections object (replaces all existing connections)',
        },
        settings: {
          type: 'object',
          description: 'Updated workflow settings',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_delete_workflow',
    description: 'Permanently delete a workflow. This action cannot be undone.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The workflow ID to delete',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_activate_workflow',
    description: 'Activate a workflow so it can be triggered. The workflow must have a valid trigger node.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The workflow ID to activate',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_deactivate_workflow',
    description: 'Deactivate a workflow to stop it from being triggered.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The workflow ID to deactivate',
        },
      },
      required: ['id'],
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

export const workflowToolHandlers = {
  n8n_list_workflows: async (
    client: N8nApiClient,
    args: Record<string, unknown>
  ): Promise<ToolResult> => {
    const result = await client.listWorkflows({
      limit: args.limit as number | undefined,
      active: args.active as boolean | undefined,
    });

    const workflows = result.data.map((w) => ({
      id: w.id,
      name: w.name,
      active: w.active,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      nodeCount: w.nodes?.length || 0,
    }));

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            count: workflows.length,
            workflows,
            hasMore: !!result.nextCursor,
          }, null, 2),
        },
      ],
    };
  },

  n8n_get_workflow: async (
    client: N8nApiClient,
    args: Record<string, unknown>
  ): Promise<ToolResult> => {
    const id = args.id as string;
    if (!id) {
      throw new Error('Workflow ID is required');
    }

    const workflow = await client.getWorkflow(id);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            id: workflow.id,
            name: workflow.name,
            active: workflow.active,
            createdAt: workflow.createdAt,
            updatedAt: workflow.updatedAt,
            nodes: workflow.nodes,
            connections: workflow.connections,
            settings: workflow.settings,
            tags: workflow.tags,
          }, null, 2),
        },
      ],
    };
  },

  n8n_create_workflow: async (
    client: N8nApiClient,
    args: Record<string, unknown>
  ): Promise<ToolResult> => {
    const name = args.name as string;
    const nodes = args.nodes as N8nNode[];
    const connections = args.connections as N8nConnections;
    const settings = args.settings as N8nWorkflowSettings | undefined;

    if (!name) {
      throw new Error('Workflow name is required');
    }
    if (!nodes || !Array.isArray(nodes)) {
      throw new Error('Nodes array is required');
    }
    if (!connections) {
      throw new Error('Connections object is required');
    }

    const workflow = await client.createWorkflow({
      name,
      nodes,
      connections,
      settings,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: `Workflow "${workflow.name}" created successfully`,
            workflow: {
              id: workflow.id,
              name: workflow.name,
              active: workflow.active,
              nodeCount: workflow.nodes.length,
            },
          }, null, 2),
        },
      ],
    };
  },

  n8n_update_workflow: async (
    client: N8nApiClient,
    args: Record<string, unknown>
  ): Promise<ToolResult> => {
    const id = args.id as string;
    if (!id) {
      throw new Error('Workflow ID is required');
    }

    const updateData: Parameters<typeof client.updateWorkflow>[1] = {};
    
    if (args.name !== undefined) updateData.name = args.name as string;
    if (args.nodes !== undefined) updateData.nodes = args.nodes as N8nNode[];
    if (args.connections !== undefined) updateData.connections = args.connections as N8nConnections;
    if (args.settings !== undefined) updateData.settings = args.settings as N8nWorkflowSettings;

    const workflow = await client.updateWorkflow(id, updateData);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: `Workflow "${workflow.name}" updated successfully`,
            workflow: {
              id: workflow.id,
              name: workflow.name,
              active: workflow.active,
              nodeCount: workflow.nodes.length,
              updatedAt: workflow.updatedAt,
            },
          }, null, 2),
        },
      ],
    };
  },

  n8n_delete_workflow: async (
    client: N8nApiClient,
    args: Record<string, unknown>
  ): Promise<ToolResult> => {
    const id = args.id as string;
    if (!id) {
      throw new Error('Workflow ID is required');
    }

    await client.deleteWorkflow(id);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: `Workflow ${id} deleted successfully`,
          }, null, 2),
        },
      ],
    };
  },

  n8n_activate_workflow: async (
    client: N8nApiClient,
    args: Record<string, unknown>
  ): Promise<ToolResult> => {
    const id = args.id as string;
    if (!id) {
      throw new Error('Workflow ID is required');
    }

    const workflow = await client.activateWorkflow(id);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: `Workflow "${workflow.name}" activated successfully`,
            workflow: {
              id: workflow.id,
              name: workflow.name,
              active: workflow.active,
            },
          }, null, 2),
        },
      ],
    };
  },

  n8n_deactivate_workflow: async (
    client: N8nApiClient,
    args: Record<string, unknown>
  ): Promise<ToolResult> => {
    const id = args.id as string;
    if (!id) {
      throw new Error('Workflow ID is required');
    }

    const workflow = await client.deactivateWorkflow(id);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: `Workflow "${workflow.name}" deactivated successfully`,
            workflow: {
              id: workflow.id,
              name: workflow.name,
              active: workflow.active,
            },
          }, null, 2),
        },
      ],
    };
  },
};

