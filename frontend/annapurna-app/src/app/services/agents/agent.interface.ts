import { FunctionTool } from '@openai/agents';
import { RealtimeAgent } from '@openai/agents-realtime';

export interface AgentService {
  
  tools: FunctionTool[];
  agentName: string;
  instructions: string;
  handoffDescription: string;

  ask(question: string): Promise<any>;
  getVoiceAgent(): RealtimeAgent | undefined;
  
}
