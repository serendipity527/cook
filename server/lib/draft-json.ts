import { DraftSpecSchema, type DraftSpec } from '@shared/schema';

function jsonCandidates(text: string): string[] {
  const cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '');
  const candidates: string[] = [];

  for (let start = 0; start < cleaned.length; start += 1) {
    if (cleaned[start] !== '{') {
      continue;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < cleaned.length; index += 1) {
      const character = cleaned[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === '\\') {
          escaped = true;
        } else if (character === '"') {
          inString = false;
        }
        continue;
      }

      if (character === '"') {
        inString = true;
      } else if (character === '{') {
        depth += 1;
      } else if (character === '}') {
        depth -= 1;

        if (depth === 0) {
          candidates.push(cleaned.slice(start, index + 1));
          break;
        }
      }
    }
  }

  return candidates.sort((a, b) => b.length - a.length);
}

export function extractDraftJson(text: string): DraftSpec {
  for (const candidate of jsonCandidates(text)) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(candidate);
    } catch {
      continue;
    }

    const result = DraftSpecSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }
  }

  throw new Error('AI 没有返回符合结构的菜谱 JSON');
}
