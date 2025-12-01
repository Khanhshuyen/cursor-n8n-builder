/**
 * n8n Cursor MCP - Type Definitions
 */

// ============================================================================
// n8n API Types
// ============================================================================

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: N8nNode[];
  connections: N8nConnections;
  settings?: N8nWorkflowSettings;
  staticData?: Record<string, unknown>;
  tags?: N8nTag[];
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
  disabled?: boolean;
  notes?: string;
  continueOnFail?: boolean;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
}

export interface N8nConnections {
  [sourceNodeName: string]: {
    [outputType: string]: Array<Array<{
      node: string;
      type: string;
      index: number;
    }>>;
  };
}

export interface N8nWorkflowSettings {
  executionOrder?: 'v0' | 'v1';
  timezone?: string;
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  saveManualExecutions?: boolean;
  saveExecutionProgress?: boolean;
  executionTimeout?: number;
  errorWorkflow?: string;
}

export interface N8nTag {
  id: string;
  name: string;
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: string;
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowData?: N8nWorkflow;
  data?: {
    resultData?: {
      runData?: Record<string, unknown[]>;
      error?: {
        message: string;
        stack?: string;
      };
    };
  };
  status: 'success' | 'error' | 'waiting' | 'running';
}

// ============================================================================
// n8n API Response Types
// ============================================================================

export interface N8nListResponse<T> {
  data: T[];
  nextCursor?: string;
}

export interface N8nApiError {
  code: number;
  message: string;
  hint?: string;
}

// ============================================================================
// MCP Tool Types
// ============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface N8nConfig {
  apiUrl: string;
  apiKey: string;
}

export interface ServerConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

