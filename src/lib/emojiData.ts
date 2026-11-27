export interface EmojiCategory { key: string; icon: string; emoji: string[] }

// Only these pages offer skin tones.
export const TONE_CATEGORIES = new Set(['people', 'hands', 'roles']);

const list = (s: string) => s.trim().split(/\s+/);
const ZWJ = '\u200D';
const HAIR = ['🦰', '🦱', '🦳', '🦲'];
const JOBS = ['⚕\uFE0F', '🎓', '🏫', '🍳', '🌾', '🔧', '💼', '🔬', '💻', '🎤', '🎨', '✈\uFE0F', '🚀', '🚒'];
const withObject = (people: string[], objects: string[]) => objects.flatMap((o) => people.map((p) => p + ZWJ + o));

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  { key: 'faces', icon: '😀', emoji: list('😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐') },
  { key: 'moods', icon: '😢', emoji: list('😕 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💋 💌 💘 💝 💟 💔 💢 💥 💦 💨 💭') },
  { key: 'characters', icon: '😺', emoji: list('😺 😸 😹 😻 😼 😽 🙀 😿 😾 🙈 🙉 🙊 💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖 🎃 🐉 🦖 🦕 🧞 🧟 🥷') },
  { key: 'people', icon: '🧑', emoji: list('👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 🕵️ 💂 👷 🤴 👸 👳 👲 🧕 🤵 👰 🤰 🤱 👼 💆 💇 🚶 🏃 💃 🕺 👯 🧖 🧘 🎅 🤶 🧙 🧚 🧛 🧜 🧝 🦸 🦹 🛀 🛌 👫 👬 👭 💏 💑 👪').concat(['👱' + ZWJ + '♀\uFE0F', '👱' + ZWJ + '♂\uFE0F'], withObject(['🧑', '👨', '👩'], HAIR)) },
  { key: 'roles', icon: '👩' + ZWJ + '💻', emoji: withObject(['👨', '👩'], JOBS) },
  { key: 'hands', icon: '👍', emoji: list('👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤏 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦵 🦶 👂 👃 🧠 👀 👁️ 👅 👄 🦷 🦴') },
  { key: 'animals', icon: '🐶', emoji: list('🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🐢 🐍 🦎 🐙 🦑 🦀 🐠 🐟 🐬 🐳 🦈 🐊 🐘 🦒 🦓 🦘 🦥 🦦 🦔 🐿️ 🦜 🦩 🦚') },
  { key: 'nature', icon: '🌿', emoji: list('🌵 🎄 🌲 🌳 🌴 🌱 🌿 🍀 🍁 🍂 🍃 🌷 🌹 🌺 🌸 🌼 🌻 🌞 🌝 🌛 ⭐ 🌟 ✨ ⚡ 🔥 🌈 ☁️ ❄️ 💧 🌊 🌍 🌙 🪐 💫 🌋 🍄 🪴 🌾 🐚 🪨') },
  { key: 'food', icon: '🍎', emoji: list('🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🍆 🥔 🥕 🌽 🥒 🥬 🥦 🧄 🧅 🥜 🍞 🥐 🥖 🧀 🥚 🍳 🥓 🥩 🍗 🍔 🍟 🍕 🌭 🌮 🌯 🍣 🍜 🍝 🍰 🍩 🍪 🎂 🍫 🍬 🍦 🍿 ☕ 🍵 🧃 🥤 🍺 🍷 🍹') },
  { key: 'activities', icon: '⚽', emoji: list('⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥊 🥋 ⛳ 🎣 🎿 🛹 🏆 🥇 🎯 🎮 🎲 🧩 🎨 🎸 🎹 🥁 🎤 🎧 🎬 📚 🎻 🎺 🎷 🪁 🏹 🛼 🏊 🚴 🧗 🏄 🎳') },
  { key: 'travel', icon: '🚗', emoji: list('🚗 🚕 🚙 🚌 🚓 🚑 🚒 🚚 🚜 🚲 🛵 🚂 🚀 🛸 🚁 ⛵ 🚢 🏠 🏡 🏢 🏰 🗽 ⛺ 🎡 🎢 🌆 🌉 🗼 🏖️ 🏔️ 🌅 🌄 🧭 🗺️ 🛶 🚤 🚡') },
  { key: 'objects', icon: '💡', emoji: list('💡 🔦 📱 💻 ⌚ 📷 🎁 🎈 🎉 🔑 🔒 🧸 🛒 💎 💰 🧺 🧼 🧽 🕯️ 🛋️ 🚿 🔧 🔨 ⚙️ 🧲 📦 ✏️ 📌 📎 🔭 🔬 💊 🩺 🧪 🎒 👑 🎩 👓 🕶️ 👟 🧢') },
  { key: 'symbols', icon: '❤️', emoji: list('❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💖 💗 💓 💞 💕 💯 ✅ ❌ ⭕ ❓ ❗ 💬 💤 🔔 🎵 ➕ ♻️ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🔶 🔷 🏁 🚩 🆒 🆕 🆓') },
];

export const ALL_EMOJI: string[] = EMOJI_CATEGORIES.flatMap((c) => c.emoji);

export const categoryOf = (emoji: string): string | null => EMOJI_CATEGORIES.find((c) => c.emoji.includes(emoji))?.key ?? null;

// Skin tones apply to people and hands. Index 0 is the default yellow.
export const SKIN_TONES = ['', '\u{1F3FB}', '\u{1F3FC}', '\u{1F3FD}', '\u{1F3FE}', '\u{1F3FF}'];
export const TONE_COLORS = ['#FFCC22', '#F7DECE', '#F3D2A2', '#D5AB88', '#AF7E57', '#7C533E'];

const TONE_HEADS = new Set(list('👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 💂 👷 🤴 👸 👳 👲 🧕 🤵 👰 🤰 🤱 👼 🎅 🤶 🦸 🦹 🧙 🧚 🧛 🧜 🧝 💆 💇 🚶 🏃 💃 🕺 🧖 🧘 🛀 🛌 👍 👎 👌 ✌ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝ ✋ 🤚 🖐 🖖 👋 🤏 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🙏 ✍ 💅 🤳 💪 🦵 🦶 👂 👃'));

const splitHead = (emoji: string): [string, string] => {
  const i = emoji.indexOf(ZWJ);
  const head = (i < 0 ? emoji : emoji.slice(0, i)).replace(/\uFE0F/g, '');
  return [head, i < 0 ? '' : emoji.slice(i)];
};

export const supportsTone = (emoji: string): boolean => TONE_HEADS.has(splitHead(emoji)[0]);

export function withTone(emoji: string, tone: number): string {
  if (tone <= 0 || !supportsTone(emoji)) return emoji;
  const [head, tail] = splitHead(emoji);
  return head + SKIN_TONES[tone] + tail;
}

export function toneOf(emoji: string): number {
  const i = SKIN_TONES.findIndex((m, n) => n > 0 && emoji.includes(m));
  return Math.max(i, 0);
}
