import { t } from '../i18n';
import { categoryChoiceLabel, categorySortRank, roomChoiceLabel } from '../models/choices';
import type { ListGrouping } from '../models/enums';
import type { GroceryItem } from '../models/entities';
import { getCategoryChoice, getRecipient, getRoomChoice } from '../models/itemOps';

export interface ListSection {
  key: string;
  title: string;
  items: GroceryItem[];
  defaultRank: number;
}

interface Header { key: string; title: string; rank: number }

function headerFor(item: GroceryItem, grouping: ListGrouping): Header {
  switch (grouping) {
    case 'category': {
      const choice = getCategoryChoice(item);
      const key = choice.kind === 'builtIn' ? `category:${choice.value}` : `category:custom:${choice.option.id}`;
      return { key, title: categoryChoiceLabel(choice), rank: categorySortRank(choice) };
    }
    case 'room': {
      const room = getRoomChoice(item);
      if (room) {
        const key = room.kind === 'builtIn' ? `room:${room.value}` : `room:custom:${room.option.id}`;
        return { key, title: roomChoiceLabel(room), rank: 0 };
      }
      return { key: 'room:none', title: t('No room'), rank: 1 };
    }
    case 'assignee':
      if (item.assignedTo) {
        return { key: `assignee:${item.assignedTo.userRecordName}`, title: `${item.assignedTo.emoji}  ${item.assignedTo.name}`, rank: 0 };
      }
      return { key: 'assignee:none', title: t('Anyone'), rank: 1 };
    case 'recipient': {
      const r = getRecipient(item);
      if (r?.kind === 'member') return { key: `recipient:${r.member.userRecordName}`, title: t('For {name}',{name:r.member.name}), rank: 0 };
      if (r?.kind === 'named') return { key: `recipient:name:${r.name.toLowerCase()}`, title: t('For {name}',{name:r.name}), rank: 0 };
      return { key: 'recipient:none', title: t('Everyone'), rank: 1 };
    }
  }
}

const time = (d: Date | null) => (d ? d.getTime() : Number.NEGATIVE_INFINITY);

export function makeSections(items: GroceryItem[], grouping: ListGrouping, order: string[] = []): ListSection[] {
  const groups = new Map<string, { header: Header; items: GroceryItem[] }>();
  for (const item of items) {
    const header = headerFor(item, grouping);
    const g = groups.get(header.key);
    if (g) g.items.push(item); else groups.set(header.key, { header, items: [item] });
  }

  const sections: ListSection[] = [...groups.values()].map(({ header, items: its }) => ({
    key: header.key,
    title: header.title,
    items: its.sort((a, b) => time(b.addedAt) - time(a.addedAt)),
    defaultRank: header.rank,
  }));

  const position = new Map<string, number>();
  order.forEach((key, i) => { if (!position.has(key)) position.set(key, i); });
  const pos = (k: string) => position.get(k) ?? Number.MAX_SAFE_INTEGER;

  return sections.sort((l, r) => {
    if (pos(l.key) !== pos(r.key)) return pos(l.key) - pos(r.key);
    if (l.defaultRank !== r.defaultRank) return l.defaultRank - r.defaultRank;
    return l.title.toLowerCase().localeCompare(r.title.toLowerCase());
  });
}
