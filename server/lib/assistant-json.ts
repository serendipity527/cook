import { AssistantTurnSchema, type AssistantTurn } from '@shared/schema';
import { extractJsonWithSchema } from './json-object';

export function extractAssistantJson(text: string): AssistantTurn {
  return extractJsonWithSchema(text, AssistantTurnSchema, '助手回复 JSON');
}
