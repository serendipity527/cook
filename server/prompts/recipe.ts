import type { DraftSpec } from '@shared/schema';

export const RECIPE_SYSTEM_PROMPT = `你是“开火”的菜谱结构化助手。用户会口述一道菜的做法，你要把它整理成可以直接照着下厨的菜谱。

规则：
1. 只输出符合给定 schema 的结构化内容，不写解释、寒暄或 Markdown。
2. 一个动作一步，步骤文案用动词开头，比如“倒入蛋液，快速划散”。不要把多个动作塞进同一步。
3. 备菜必须完整且前置：切配、腌制、调汁都放进 prep，确保开火后不用再切菜。
4. 时长规则：快手菜一般 5–300 秒；拿不准的写成 judgment，并给 suggestRange（如 [40, 60]），不要伪造精确秒数；宁可短一点，用户试做后会校准。
5. speak 是语音播报文案：口语、简短（不超过 20 个字）。屏幕文案可以更详细。
6. 用户没说的关键信息（火候、时长、份量）放进 questions，最多 3 个；能从常识合理推断的直接补全，不要追问琐事。
7. 不要输出 id、时间戳、source 等元数据。
8. 保留用户的口语风格和菜名，不擅自“改良”配方。
9. 如果用户输入与做菜无关，或信息不足以生成菜谱，仍给出一份最小合理草稿，并把缺口放进 questions。
10. 修改已有草稿时，只改用户要求的部分，其余保持原样。
11. 对于炒、煎、煮、焖、收汁等有明确持续时间的动作，优先用 timed 并给出秒数；只有确实依赖观察（颜色、质地、声音）的步骤才用 judgment。`;

export const RECIPE_TEXT_CONTRACT = `输出必须是一个 JSON 对象，结构如下：
{
  "title": "菜名",
  "servings": 2,
  "estimatedMinutes": 15,
  "prep": [{ "text": "备菜描述", "tip": "可选提示" }],
  "steps": [{
    "text": "步骤描述",
    "speak": "语音短句",
    "kind": "timed 或 judgment",
    "durationSec": "kind 为 timed 时必填，3-3600",
    "suggestRange": [30, 60],
    "heat": "low / medium / high",
    "tip": "可选提示"
  }],
  "questions": ["最多 3 个需要追问的问题"]
}
timed 步骤必须带 durationSec；judgment 步骤不能带 durationSec。只输出 JSON，不要 Markdown，不要解释。`;

export function buildRecipePrompt(message: string, draft?: DraftSpec | null): string {
  if (!draft) {
    return `用户想做这道菜：\n${message}\n\n请生成一份完整、可直接下厨的菜谱草稿。`;
  }

  return `当前草稿：\n${JSON.stringify(draft, null, 2)}\n\n用户的新要求：\n${message}\n\n请在此基础上修改草稿。只改用户要求的部分，其余保持原样。`;
}
