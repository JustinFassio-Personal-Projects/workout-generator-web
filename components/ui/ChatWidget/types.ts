export interface ChatWidgetProps {
  /**
   * Workflow ID from ChatKit Studio (format: wf_...)
   * Required - identifies the Agent Builder workflow
   * If not provided, will use NEXT_PUBLIC_CHATKIT_WORKFLOW_ID env variable
   */
  workflowId?: string
  /**
   * User ID for the chat session
   * If not provided, defaults to 'anonymous'
   */
  userId?: string
  /**
   * Agent ID from ChatKit Studio (deprecated, use workflowId instead)
   * If not provided, will use NEXT_PUBLIC_CHATKIT_AGENT_ID env variable
   */
  agentId?: string
  /**
   * Initial state of the widget (open or closed)
   * @default false
   */
  defaultOpen?: boolean
  /**
   * Custom className for styling
   */
  className?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}
