import fs from 'node:fs';
import path from 'node:path';

export interface Guide {
  slug: string;
  title: string;
  summary: string;
  order: number;
  tags: string[];
  updated: string;
  sources: string[];
  body: string;
}

const DIR = path.join(process.cwd(), 'content', 'guides');

/** 极简 YAML frontmatter 解析：只支持 key: value、行内数组 [a, b]、以及 "- item" 列表 */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!m) return { data: {}, body: raw };

  const data: Record<string, unknown> = {};
  let currentKey: string | null = null;

  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const listItem = /^\s*-\s+(.*)$/.exec(line);
    if (listItem && currentKey) {
      const arr = (data[currentKey] as unknown[]) || [];
      arr.push(unquote(listItem[1].trim()));
      data[currentKey] = arr;
      continue;
    }

    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    const [, key, rest] = kv;
    currentKey = key;
    const value = rest.trim();
    if (!value) {
      data[key] = [];
      continue;
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map(s => unquote(s.trim()))
        .filter(Boolean);
    } else {
      data[key] = unquote(value);
    }
  }

  return { data, body: raw.slice(m[0].length) };
}

function unquote(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

let cache: Guide[] | null = null;

export function getAllGuides(): Guide[] {
  if (cache) return cache;
  if (!fs.existsSync(DIR)) {
    cache = [];
    return cache;
  }
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.md'));
  const guides = files.map(file => {
    const raw = fs.readFileSync(path.join(DIR, file), 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const slug = String(data.slug || file.replace(/\.md$/, ''));
    return {
      slug,
      title: String(data.title || slug),
      summary: String(data.summary || ''),
      order: Number(data.order ?? 99),
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      updated: String(data.updated || ''),
      sources: Array.isArray(data.sources) ? (data.sources as string[]) : [],
      body: body.trim(),
    };
  });
  guides.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'zh'));
  cache = guides;
  return guides;
}

export function getGuide(slug: string): Guide | undefined {
  return getAllGuides().find(g => g.slug === slug);
}

/** 粗略估算阅读时长（中文按 400 字/分钟） */
export function readingMinutes(body: string): number {
  const text = body.replace(/```[\s\S]*?```/g, '').replace(/[#>*`|\-]/g, '');
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = (text.match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.round(cjk / 400 + words / 200));
}