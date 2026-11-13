import type { Recipe } from '@shared/schema';

export interface LocalReply {
  reply: string;
  recipeIds?: string[];
}

interface LocalAssistantInput {
  message: string;
  recipes: Recipe[];
  hasDraft: boolean;
  draftTitle?: string;
}

const greetingPattern = /^(你好|您好|hi|hello|嗨|哈喽|在吗|早上好|中午好|晚上好)$/i;

function normalize(text: string): string {
  return text.trim().replace(/[！!。.,，、?？~\s]/g, '');
}

export function localAssistantReply({
  message,
  recipes,
  hasDraft,
  draftTitle,
}: LocalAssistantInput): LocalReply | null {
  const normalized = normalize(message);

  if (greetingPattern.test(normalized)) {
    if (hasDraft) {
      return {
        reply: `你好，我在。刚才${draftTitle ? `《${draftTitle}》` : '这道菜'}的草稿还在下面，想改哪里？`,
      };
    }

    return { reply: '你好，我是开火。可以帮你查菜谱、录新菜，也可以聊聊做饭。' };
  }

  if (/(查看|打开|看看|看一下)/.test(message)) {
    const matches = recipes.filter((recipe) => message.includes(recipe.title));

    if (matches.length === 1) {
      const recipe = matches[0]!;
      return {
        reply: `找到了《${recipe.title}》，点下面的卡片打开。`,
        recipeIds: [recipe.id],
      };
    }

    if (matches.length > 1) {
      return {
        reply: `找到了 ${matches.length} 道相关菜谱，你想看哪一道？`,
        recipeIds: matches.map((recipe) => recipe.id),
      };
    }
  }

  if (/(有哪些|查看|列出|看看|我的|全部)/.test(message) && /(菜谱|食谱)/.test(message)) {
    if (recipes.length === 0) {
      return { reply: '现在还没有菜谱。想录哪道菜？把做法说给我就行。' };
    }

    return {
      reply: `你现在有 ${recipes.length} 道菜谱：${recipes
        .map((recipe) => `《${recipe.title}》`)
        .join('、')}。想看哪一道，或者要我帮你录新的？`,
      recipeIds: recipes.map((recipe) => recipe.id),
    };
  }

  if (/^(新建|创建|录)(一个|一道)?(菜谱|食谱)$/.test(normalized)) {
    if (hasDraft) {
      return {
        reply: `你还在编辑${draftTitle ? `《${draftTitle}》` : '当前草稿'}。先保存或点右上角“重新开始”，再录新的。`,
      };
    }

    return { reply: '想做哪道菜？把做法、份量和要点说给我，我来整理成步骤和倒计时。' };
  }

  if (/(今天吃什么|吃什么好|随便做点什么)/.test(normalized) && recipes.length > 0) {
    const recipe = recipes[Math.floor(Math.random() * recipes.length)]!;
    return { reply: `今天做《${recipe.title}》怎么样？`, recipeIds: [recipe.id] };
  }

  return null;
}
