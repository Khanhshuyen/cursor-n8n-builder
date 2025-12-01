/**
 * Documentation Tools
 * Provides self-documentation for AI to understand how to use n8n MCP tools
 */

import { ToolDefinition, ToolResult } from '../types';

// ============================================================================
// Tool Definitions
// ============================================================================

export const documentationTools: ToolDefinition[] = [
  {
    name: 'n8n_tools_help',
    description: 'Get documentation and usage guide for n8n MCP tools. Call this first to understand available capabilities.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: ['overview', 'workflows', 'executions', 'nodes', 'examples'],
          description: 'Topic to get help about. "overview" for general guide, "workflows" for workflow management, "executions" for execution management, "nodes" for common node types, "examples" for usage examples.',
        },
      },
    },
  },
  {
    name: 'n8n_get_node_info',
    description: 'Get information about common n8n node types and their configurations.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeType: {
          type: 'string',
          description: 'Node type to get info about (e.g., "webhook", "httpRequest", "code", "if", "set")',
        },
      },
      required: ['nodeType'],
    },
  },
];

// ============================================================================
// Common Node Information
// ============================================================================

const COMMON_NODES: Record<string, {
  type: string;
  displayName: string;
  description: string;
  typeVersion: number;
  defaultParameters: Record<string, unknown>;
  exampleConfig: Record<string, unknown>;
}> = {
  webhook: {
    type: 'n8n-nodes-base.webhook',
    displayName: 'Webhook',
    description: 'Starts the workflow when a webhook is called. Can receive data via HTTP requests.',
    typeVersion: 2,
    defaultParameters: {
      httpMethod: 'POST',
      path: 'webhook',
      responseMode: 'onReceived',
      responseCode: 200,
    },
    exampleConfig: {
      httpMethod: 'POST',
      path: 'my-webhook',
      responseMode: 'onReceived',
      responseData: 'allEntries',
    },
  },
  httpRequest: {
    type: 'n8n-nodes-base.httpRequest',
    displayName: 'HTTP Request',
    description: 'Makes HTTP requests to fetch or send data to any URL.',
    typeVersion: 4,
    defaultParameters: {
      method: 'GET',
      url: '',
      authentication: 'none',
    },
    exampleConfig: {
      method: 'POST',
      url: 'https://api.example.com/data',
      authentication: 'none',
      sendBody: true,
      bodyParameters: {
        parameters: [
          { name: 'key', value: '={{ $json.value }}' }
        ]
      },
    },
  },
  code: {
    type: 'n8n-nodes-base.code',
    displayName: 'Code',
    description: 'Execute custom JavaScript or Python code.',
    typeVersion: 2,
    defaultParameters: {
      language: 'javaScript',
      mode: 'runOnceForAllItems',
    },
    exampleConfig: {
      language: 'javaScript',
      mode: 'runOnceForAllItems',
      jsCode: `// Process all items
const results = [];
for (const item of $input.all()) {
  results.push({
    json: {
      ...item.json,
      processed: true
    }
  });
}
return results;`,
    },
  },
  'if': {
    type: 'n8n-nodes-base.if',
    displayName: 'IF',
    description: 'Route items based on conditions. Has two outputs: true and false.',
    typeVersion: 2,
    defaultParameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
        },
        conditions: [],
        combinator: 'and',
      },
    },
    exampleConfig: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
        },
        conditions: [
          {
            id: 'condition-1',
            leftValue: '={{ $json.status }}',
            rightValue: 'success',
            operator: {
              type: 'string',
              operation: 'equals',
            },
          },
        ],
        combinator: 'and',
      },
    },
  },
  set: {
    type: 'n8n-nodes-base.set',
    displayName: 'Set',
    description: 'Set or modify data fields in items.',
    typeVersion: 3,
    defaultParameters: {
      mode: 'manual',
      duplicateItem: false,
      assignments: {
        assignments: [],
      },
    },
    exampleConfig: {
      mode: 'manual',
      duplicateItem: false,
      assignments: {
        assignments: [
          {
            id: 'assignment-1',
            name: 'newField',
            value: '={{ $json.existingField }}',
            type: 'string',
          },
        ],
      },
    },
  },
  scheduleTrigger: {
    type: 'n8n-nodes-base.scheduleTrigger',
    displayName: 'Schedule Trigger',
    description: 'Starts the workflow on a schedule (cron-like).',
    typeVersion: 1,
    defaultParameters: {
      rule: {
        interval: [{ field: 'hours', minutesInterval: 1 }],
      },
    },
    exampleConfig: {
      rule: {
        interval: [
          {
            field: 'cronExpression',
            expression: '0 9 * * 1-5', // Every weekday at 9 AM
          },
        ],
      },
    },
  },
  manualTrigger: {
    type: 'n8n-nodes-base.manualTrigger',
    displayName: 'Manual Trigger',
    description: 'Starts the workflow manually. Used for testing.',
    typeVersion: 1,
    defaultParameters: {},
    exampleConfig: {},
  },
  merge: {
    type: 'n8n-nodes-base.merge',
    displayName: 'Merge',
    description: 'Merge data from multiple inputs.',
    typeVersion: 3,
    defaultParameters: {
      mode: 'append',
    },
    exampleConfig: {
      mode: 'combine',
      mergeByFields: {
        values: [{ field1: 'id', field2: 'id' }],
      },
      options: {},
    },
  },
  splitInBatches: {
    type: 'n8n-nodes-base.splitInBatches',
    displayName: 'Split In Batches',
    description: 'Split items into batches for processing.',
    typeVersion: 3,
    defaultParameters: {
      batchSize: 10,
    },
    exampleConfig: {
      batchSize: 10,
      options: {
        reset: false,
      },
    },
  },
  respondToWebhook: {
    type: 'n8n-nodes-base.respondToWebhook',
    displayName: 'Respond to Webhook',
    description: 'Send a response back to the webhook caller.',
    typeVersion: 1,
    defaultParameters: {
      respondWith: 'allIncomingItems',
      responseCode: 200,
    },
    exampleConfig: {
      respondWith: 'json',
      responseBody: '={{ $json }}',
      responseCode: 200,
      responseHeaders: {
        entries: [
          { name: 'Content-Type', value: 'application/json' },
        ],
      },
    },
  },
};

// ============================================================================
// Documentation Content
// ============================================================================

const DOCUMENTATION = {
  overview: `# n8n Cursor MCP - Overview

This MCP server enables AI assistants in Cursor IDE to manage your n8n workflows.

## Available Tools

### Workflow Management
- **n8n_list_workflows** - List all workflows
- **n8n_get_workflow** - Get workflow details
- **n8n_create_workflow** - Create a new workflow
- **n8n_update_workflow** - Update a workflow
- **n8n_delete_workflow** - Delete a workflow
- **n8n_activate_workflow** - Activate a workflow
- **n8n_deactivate_workflow** - Deactivate a workflow

### Execution Management
- **n8n_list_executions** - List execution history
- **n8n_get_execution** - Get execution details
- **n8n_delete_execution** - Delete an execution record
- **n8n_trigger_webhook** - Trigger a webhook

### Help
- **n8n_tools_help** - This help menu
- **n8n_get_node_info** - Node information
- **n8n_health_check** - Connection check

## Recommended Workflow
1. First, verify the connection with \`n8n_health_check\`
2. View existing workflows with \`n8n_list_workflows\`
3. Learn about nodes you want to use with \`n8n_get_node_info\`
4. Create a new workflow with \`n8n_create_workflow\`
5. Activate the workflow with \`n8n_activate_workflow\`
`,

  workflows: `# Workflow Management

## Creating Workflows

Every workflow consists of these components:
- **name**: Workflow name
- **nodes**: Array of nodes
- **connections**: Connections between nodes

### Node Structure
\`\`\`json
{
  "id": "unique-id",
  "name": "Node Name",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2,
  "position": [250, 300],
  "parameters": { }
}
\`\`\`

### Connection Structure
\`\`\`json
{
  "Source Node": {
    "main": [
      [{ "node": "Target Node", "type": "main", "index": 0 }]
    ]
  }
}
\`\`\`

## Important Notes
- Workflows are created in **inactive** state
- Use \`n8n_activate_workflow\` to activate
- Workflows without a trigger node cannot be activated
- Position values are pixel coordinates in [x, y] format
`,

  executions: `# Execution Management

## Execution States
- **success**: Completed successfully
- **error**: Ended with an error
- **waiting**: Waiting (webhook response, scheduler, etc.)

## Triggering Webhooks

You can trigger active workflows using \`n8n_trigger_webhook\`:
- Workflow must be **active**
- Must have a webhook node
- HTTP method must be correct (usually POST)

### Example
\`\`\`
n8n_trigger_webhook({
  webhookUrl: "https://n8n.example.com/webhook/abc-123",
  method: "POST",
  data: { "message": "Hello" }
})
\`\`\`
`,

  nodes: `# Common n8n Nodes

## Trigger Nodes (Workflow starters)
- **webhook** - Trigger via HTTP webhook
- **scheduleTrigger** - Scheduled trigger (cron)
- **manualTrigger** - Manual trigger (for testing)

## Action Nodes
- **httpRequest** - Make HTTP requests
- **code** - Run JavaScript/Python code
- **set** - Set data fields
- **if** - Conditional branching
- **merge** - Merge data
- **splitInBatches** - Split data into batches

## Response Nodes
- **respondToWebhook** - Send webhook response

## Getting Node Information
Get detailed info with \`n8n_get_node_info\`:
\`\`\`
n8n_get_node_info({ nodeType: "webhook" })
n8n_get_node_info({ nodeType: "httpRequest" })
\`\`\`
`,

  examples: `# Example Workflows

## 1. Simple Webhook Workflow
\`\`\`json
{
  "name": "Simple Webhook",
  "nodes": [
    {
      "id": "webhook-1",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "my-webhook",
        "responseMode": "onReceived"
      }
    },
    {
      "id": "respond-1",
      "name": "Respond",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [450, 300],
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { success: true, data: $json } }}"
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Respond", "type": "main", "index": 0 }]]
    }
  }
}
\`\`\`

## 2. API Call with HTTP Request
\`\`\`json
{
  "name": "API Call Workflow",
  "nodes": [
    {
      "id": "trigger-1",
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [250, 300],
      "parameters": {}
    },
    {
      "id": "http-1",
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [450, 300],
      "parameters": {
        "method": "GET",
        "url": "https://api.example.com/data"
      }
    }
  ],
  "connections": {
    "Manual Trigger": {
      "main": [[{ "node": "HTTP Request", "type": "main", "index": 0 }]]
    }
  }
}
\`\`\`

## 3. Conditional Processing
\`\`\`json
{
  "name": "Conditional Workflow",
  "nodes": [
    {
      "id": "webhook-1",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "check-status"
      }
    },
    {
      "id": "if-1",
      "name": "Check Status",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [450, 300],
      "parameters": {
        "conditions": {
          "conditions": [{
            "leftValue": "={{ $json.status }}",
            "rightValue": "active",
            "operator": { "type": "string", "operation": "equals" }
          }],
          "combinator": "and"
        }
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Check Status", "type": "main", "index": 0 }]]
    }
  }
}
\`\`\`
`,
};

// ============================================================================
// Tool Handlers
// ============================================================================

export const documentationToolHandlers = {
  n8n_tools_help: async (
    args: Record<string, unknown>
  ): Promise<ToolResult> => {
    const topic = (args.topic as string) || 'overview';
    const content = DOCUMENTATION[topic as keyof typeof DOCUMENTATION] || DOCUMENTATION.overview;

    return {
      content: [
        {
          type: 'text' as const,
          text: content,
        },
      ],
    };
  },

  n8n_get_node_info: async (
    args: Record<string, unknown>
  ): Promise<ToolResult> => {
    const nodeType = (args.nodeType as string)?.toLowerCase();
    
    if (!nodeType) {
      // List all available nodes
      const nodeList = Object.entries(COMMON_NODES).map(([key, node]) => ({
        key,
        type: node.type,
        displayName: node.displayName,
        description: node.description,
      }));

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              message: 'Available node types',
              nodes: nodeList,
              usage: 'Call n8n_get_node_info with nodeType parameter for detailed info',
            }, null, 2),
          },
        ],
      };
    }

    const nodeInfo = COMMON_NODES[nodeType];
    
    if (!nodeInfo) {
      const availableNodes = Object.keys(COMMON_NODES).join(', ');
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: `Unknown node type: ${nodeType}`,
              availableNodes,
              hint: 'Use one of the available node types listed above',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            nodeType: nodeInfo.type,
            displayName: nodeInfo.displayName,
            description: nodeInfo.description,
            typeVersion: nodeInfo.typeVersion,
            defaultParameters: nodeInfo.defaultParameters,
            exampleConfig: nodeInfo.exampleConfig,
            usage: `Use this node in your workflow with type: "${nodeInfo.type}"`,
          }, null, 2),
        },
      ],
    };
  },
};

