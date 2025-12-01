/**
 * MCP Tools Index
 * Exports all tool definitions and handlers
 */

import { ToolDefinition } from '../types';
import { workflowTools, workflowToolHandlers } from './workflow-tools';
import { executionTools, executionToolHandlers } from './execution-tools';
import { documentationTools, documentationToolHandlers } from './documentation-tools';

// Combine all tool definitions
export const allTools: ToolDefinition[] = [
  ...documentationTools,  // Documentation first for discoverability
  ...workflowTools,
  ...executionTools,
];

// Re-export handlers
export { workflowToolHandlers } from './workflow-tools';
export { executionToolHandlers } from './execution-tools';
export { documentationToolHandlers } from './documentation-tools';

// Combined handlers type
export type AllToolHandlers = 
  typeof workflowToolHandlers & 
  typeof executionToolHandlers &
  typeof documentationToolHandlers;

