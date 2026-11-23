'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ITEMS,
  NATURES,
  WEATHERS,
  calcHP,
  calcStat,
  damageRolls,
  itemByKey,
  koRange,
  natureMod,
  stageMul,
  summarize,
  typeMultiplier,
  TYPE_BOOST,
  type StatKey,
  type Weather,
} from '@/lib/calc-shared';
import { typeColor, typeZh } from '@/lib/shared';
import type { IndexRow } from '@/lib/types';
import indexJson from '@/data/index.json';
import statsJson from '@/data/stats.json';
import { TypeIcon } from './TypeIcon';

const INDEX = indexJson as unknown as IndexRow[];
const STATS = statsJson as unknown as Record<string, number[]>;

interface MoveRec {
  n: string;
  e: string;
  t: string;
  c: 'status' | 'physical' | 'special';
  cz: string;
  p: number;
  pp: number;
  a: number;
  pr: number;
  d: string;
}

interface Side {
  id: number;
  nature: string;
  item: string;
  ev: number;
  hpEv: number;
  defEv: number;
  boost: number;
}

const DEFAULT_SIDE: Side = {
  id: 25,
  nature: '开朗',
  item: '',
  ev: 252,
  hpEv: 0,
  defEv: 0,
  boost: 0,
};

const statName: Record<StatKey, string> = {
  hp: 'HP',
  atk: '攻击',
  def: '防御',
  spa: '特攻',
  spd: '特防',
  spe: '速度',
};

function itemStat(itemKey: string, key: StatKey): number {
  const it = itemByKey(itemKey);
  const map: Partial<Record<StatKey, number | undefined>> = {
    atk: it.atk,
    def: it.def,
    spa: it.spa,
    spd: it.spd,
    spe: it.spe,
  };
  return map[key] ?? 1;
}

function statOf(
  base: number,
  ev: number,
  level: number,
  nature: string,
  key: StatKey,
  itemKey: string,
): number {
  const raw = calcStat(base, ev, level, natureMod(nature, key));
  return Math.floor(raw * itemStat(itemKey, key));
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="border border-line-soft bg-paper p-3.5">{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="label mb-1.5">{children}</div>;
}

function Select({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-9 w-full appearance-none border border-line-soft bg-bg px-2 text-[12px] text-ink outline-none focus:border-ink"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function NumberField({
  value,
  onChange,
  min = 0,
  max = 252,
  step = 4,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel: string;
}) {
  return (
    <input
      type="number"
      aria-label={ariaLabel}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => {
        const n = Number(e.target.value);
        onChange(Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min);
      }}
      className="num h-9 w-full border border-line-soft bg-bg px-2 text-[12px] text-ink outline-none focus:border-ink"
    />
  );
}

function MonPicker({
  side,
  onChange,
  title,
}: {
  side: Side;
  onChange: (s: Side) => void;
  title: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const current = INDEX.find(r => r[0] === side.id);
  const kw = q.trim().toLowerCase();
  const hits = kw
    ? INDEX.filter(
        r =>
          r[1].toLowerCase().includes(kw) ||
          r[2].toLowerCase().includes(kw) ||
          String(r[0]) === kw,
      ).slice(0, 8)
    : [];

  const row = STATS[String(side.id)];

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label">{title}</span>
        {row && (
          <span className="num text-[10px] text-muted">
            {row.join(' · ')}
          </span>
        )}
      </div>

      <div className="relative">
        <input
          value={q}
          onChange={e => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={current ? `${current[1]} / ${current[2]}` : '输入名称或编号'}
          aria-label={`${title} 宝可梦`}
          className="h-9 w-full border border-line-soft bg-bg px-2 text-[12px] text-ink outline-none placeholder:text-muted/80 focus:border-ink"
        />
        {open && hits.length > 0 && (
          <div className="absolute inset-x-0 top-[calc(100%+4px)] z-30 border border-line bg-paper">
            {hits.map(r => (
              <button
                key={r[0]}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  onChange({ ...side, id: r[0] });
                  setQ('');
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 border-b border-line-soft px-2 py-1.5 text-left transition last:border-b-0 hover:bg-surface-2"
              >
                <span className="num w-9 shrink-0 text-[10px] text-muted">
                  {String(r[0]).padStart(4, '0')}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{r[1]}</span>
                <span className="flex shrink-0 gap-1">
                  {r[3].map(t => (
                    <TypeIcon key={t} type={t} size={11} color={typeColor(t)} />
                  ))}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {current && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-dim">
          {current[3].map(t => (
            <span key={t} className="flex items-center gap-1">
              <TypeIcon type={t} size={10} color={typeColor(t)} />
              {typeZh(t)}
            </span>
          ))}
          <span className="num ml-auto text-[10px] text-muted">#{String(current[0]).padStart(4, '0')}</span>
        </div>
      )}
    </div>
  );
}

export function BattleCalc() {
  const [moves, setMoves] = useState<Record<string, MoveRec> | null>(null);
  const [tab, setTab] = useState<'speed' | 'damage'>('speed');
  const [level, setLevel] = useState(50);
  const [weather, setWeather] = useState<Weather>('');
  const [crit, setCrit] = useState(false);
  const [burn, setBurn] = useState(false);
  const [tailwind, setTailwind] = useState(false);
  const [weatherAbility, setWeatherAbility] = useState(false);

  const [a, setA] = useState<Side>({ ...DEFAULT_SIDE, id: 25, nature: '开朗', item: 'choice-scarf' });
  const [b, setB] = useState<Side>({ ...DEFAULT_SIDE, id: 149, nature: '胆小', item: '', boost: 0 });
  const [moveId, setMoveId] = useState('85');

  // 支持用 URL 参数预填，便于分享「这一发能不能打死」这类链接：
  // ?tab=damage&a=25&b=149&move=85&level=50&an=胆小&bn=固执&ai=choice-scarf&bi=life-orb
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const num = (k: string, fb: number) => {
      const v = Number(p.get(k));
      return Number.isFinite(v) && v > 0 ? v : fb;
    };
    const t = p.get('tab');
    if (t === 'damage' || t === 'speed') setTab(t);
    const lv = num('level', 0);
    if (lv) setLevel(lv);
    const mv = p.get('move');
    if (mv) setMoveId(mv);
    const a2: Side = { ...DEFAULT_SIDE, id: num('a', DEFAULT_SIDE.id) };
    const b2: Side = { ...DEFAULT_SIDE, id: num('b', 149) };
    if (p.get('an')) a2.nature = p.get('an') as string;
    if (p.get('bn')) b2.nature = p.get('bn') as string;
    if (p.get('ai')) a2.item = p.get('ai') as string;
    if (p.get('bi')) b2.item = p.get('bi') as string;
    if (p.get('ae')) a2.ev = Number(p.get('ae')) || 0;
    if (p.get('be')) b2.ev = Number(p.get('be')) || 0;
    if (p.get('bh')) b2.hpEv = Number(p.get('bh')) || 0;
    if (p.get('bd')) b2.defEv = Number(p.get('bd')) || 0;
    setA(a2);
    setB(b2);
  }, []);

  useEffect(() => {
    if (tab === 'damage' && !moves) {
      import('@/data/moves.json').then(m =>
        setMoves((m.default as unknown as { moves: Record<string, MoveRec> }).moves),
      );
    }
  }, [tab, moves]);

  const aRow = STATS[String(a.id)];
  const bRow = STATS[String(b.id)];
  const aInfo = INDEX.find(r => r[0] === a.id);
  const bInfo = INDEX.find(r => r[0] === b.id);

  const speedA = useMemo(() => {
    if (!aRow) return 0;
    const base = statOf(aRow[5], a.ev, level, a.nature, 'spe', a.item);
    const boost = stageMul(a.boost);
    const tail = tailwind ? 2 : 1;
    const ability = weatherAbility && weather ? 2 : 1;
    return Math.floor(base * boost * tail * ability);
  }, [aRow, a, level, tailwind, weatherAbility, weather]);

  const speedB = useMemo(() => {
    if (!bRow) return 0;
    const base = statOf(bRow[5], b.ev, level, b.nature, 'spe', b.item);
    const boost = stageMul(b.boost);
    const tail = tailwind ? 2 : 1;
    const ability = weatherAbility && weather ? 2 : 1;
    return Math.floor(base * boost * tail * ability);
  }, [bRow, b, level, tailwind, weatherAbility, weather]);

  const move = moves?.[moveId];
  const aTypes = aInfo ? aInfo[3] : [];
  const bTypes = bInfo ? bInfo[3] : [];

  const damage = useMemo(() => {
    if (!aRow || !bRow || !move || move.p <= 0) return null;
    const physical = move.c === 'physical';
    const atkBase = physical ? aRow[1] : aRow[3];
    const defBase = physical ? bRow[2] : bRow[4];
    const atkEv = physical ? a.ev : a.ev;
    const defEv = b.defEv;
    const atk = statOf(atkBase, atkEv, level, a.nature, physical ? 'atk' : 'spa', a.item);
    const def = statOf(defBase, defEv, level, b.nature, physical ? 'def' : 'spd', b.item);
    const atkItem = itemByKey(a.item);
    const eff = typeMultiplier(cap(move.t), bTypes);
    const stab = aTypes.some(t => t.toLowerCase() === move.t.toLowerCase());
    let itemMod = 1;
    if (atkItem.dmg) itemMod *= atkItem.dmg;
    if (atkItem.seDmg && eff > 1) itemMod *= atkItem.seDmg;
    if (atkItem.type && atkItem.type.toLowerCase() === move.t.toLowerCase()) itemMod *= TYPE_BOOST;
    const rolls = damageRolls({
      level,
      power: move.p,
      category: physical ? 'physical' : 'special',
      attack: atk,
      defense: def,
      attackType: cap(move.t),
      defenderTypes: bTypes,
      stab,
      weather,
      crit,
      burn,
      itemMod,
    });
    const summary = summarize(rolls, eff);
    const hp = calcHP(bRow[0], b.hpEv, level);
    return { summary, hp, stab, atk, def, physical };
  }, [aRow, bRow, a, b, move, level, bTypes, aTypes, weather, crit, burn]);

  const moveList = useMemo(() => {
    if (!moves) return [];
    return Object.entries(moves)
      .map(([id, m]) => ({ id, ...m }))
      .sort((x, y) => x.id.localeCompare(y.id));
  }, [moves]);

  const first = speedA === speedB ? '同速' : speedA > speedB ? 'A' : 'B';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-px border border-line bg-line">
        {(
          [
            ['speed', '速度线'],
            ['damage', '伤害计算'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-[12px] transition ${
              tab === key ? 'bg-ink text-bg' : 'bg-paper text-ink-dim hover:bg-surface-2'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 bg-paper px-2 py-1">
          <span className="label">LEVEL</span>
          <select
            aria-label="等级"
            value={level}
            onChange={e => setLevel(Number(e.target.value))}
            className="num h-7 border border-line-soft bg-bg px-1.5 text-[11px] outline-none focus:border-ink"
          >
            {[50, 100, 5].map(l => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {[
          { side: a, set: setA, title: 'A 方', info: aInfo },
          { side: b, set: setB, title: 'B 方', info: bInfo },
        ].map(({ side, set, title }) => (
          <Box key={title}>
            <MonPicker side={side} onChange={set} title={title} />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <Label>性格</Label>
                <Select
                  ariaLabel={`${title} 性格`}
                  value={side.nature}
                  onChange={v => set({ ...side, nature: v })}
                  options={NATURES.map(n => ({
                    value: n.zh,
                    label: n.plus ? `${n.zh} +${statName[n.plus]} -${statName[n.minus!]}` : `${n.zh}（无修正）`,
                  }))}
                />
              </div>
              <div>
                <Label>道具</Label>
                <Select
                  ariaLabel={`${title} 道具`}
                  value={side.item}
                  onChange={v => set({ ...side, item: v })}
                  options={ITEMS.map(i => ({ value: i.key, label: i.zh }))}
                />
              </div>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <div>
                <Label>{tab === 'speed' ? '速度努力值' : '攻击/特攻努力值'}</Label>
                <NumberField
                  ariaLabel={`${title} 努力值`}
                  value={side.ev}
                  onChange={v => set({ ...side, ev: v })}
                />
              </div>
              <div>
                <Label>HP 努力值</Label>
                <NumberField
                  ariaLabel={`${title} HP 努力值`}
                  value={side.hpEv}
                  onChange={v => set({ ...side, hpEv: v })}
                />
              </div>
              <div>
                <Label>防御努力值</Label>
                <NumberField
                  ariaLabel={`${title} 防御努力值`}
                  value={side.defEv}
                  onChange={v => set({ ...side, defEv: v })}
                />
              </div>
            </div>

            <div className="mt-2">
              <Label>能力等级（速度/攻击）</Label>
              <Select
                ariaLabel={`${title} 能力等级`}
                value={String(side.boost)}
                onChange={v => set({ ...side, boost: Number(v) })}
                options={[-2, -1, 0, 1, 2, 3, 4, 5, 6].map(n => ({
                  value: String(n),
                  label: n === 0 ? '0（无变化）' : `${n > 0 ? '+' : ''}${n}`,
                }))}
              />
            </div>
          </Box>
        ))}
      </div>

      {tab === 'speed' && (
        <div className="mt-3 border border-line bg-surface px-4 py-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-6">
              <div>
                <div className="label">A SPEED</div>
                <div className={`num text-[38px] leading-none ${first === 'A' ? 'text-brand' : 'text-ink'}`}>
                  {speedA}
                </div>
                <div className="mt-1 text-[11px] text-muted">{aInfo?.[1] ?? '—'}</div>
              </div>
              <div className="text-[11px] text-muted">VS</div>
              <div>
                <div className="label">B SPEED</div>
                <div className={`num text-[38px] leading-none ${first === 'B' ? 'text-brand' : 'text-ink'}`}>
                  {speedB}
                </div>
                <div className="mt-1 text-[11px] text-muted">{bInfo?.[1] ?? '—'}</div>
              </div>
            </div>

            <div className="text-right">
              <div className="label">先手</div>
              <div className="text-[15px] font-medium text-ink">
                {first === '同速' ? '同速 —— 随机先手' : `${first} 方先手`}
              </div>
              <div className="num mt-1 text-[11px] text-muted">
                {first === '同速' ? '0' : `+${Math.abs(speedA - speedB)}`} 速度差
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line-soft pt-3 text-[11px] text-ink-dim">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={tailwind}
                onChange={e => setTailwind(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#002fa7]"
              />
              顺风（×2）
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={weatherAbility}
                onChange={e => setWeatherAbility(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#002fa7]"
              />
              天气特性（轻快/叶绿素等，×2）
            </label>
            <div className="ml-auto flex items-center gap-2">
              <span className="label">WEATHER</span>
              <select
                aria-label="天气"
                value={weather}
                onChange={e => setWeather(e.target.value as Weather)}
                className="h-7 border border-line-soft bg-paper px-1.5 text-[11px] outline-none focus:border-ink"
              >
                {WEATHERS.map(w => (
                  <option key={w.key} value={w.key}>
                    {w.zh}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted">
            速度按 Lv.{level}、个体值 31、上方努力值计算；讲究围巾 ×1.5 已计入道具列。未计能力等级以外的场地与特性修正。
          </p>
        </div>
      )}

      {tab === 'damage' && (
        <div className="mt-3 border border-line bg-surface px-4 py-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div>
              <Label>招式（A → B）</Label>
              <MoveInput
                moves={moveList}
                value={moveId}
                onChange={setMoveId}
              />
              {move && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-dim">
                  <span className="flex items-center gap-1">
                    <TypeIcon type={cap(move.t)} size={11} color={typeColor(cap(move.t))} />
                    {typeZh(cap(move.t))}
                  </span>
                  <span className="num">威力 {move.p || '—'}</span>
                  <span className="num">命中 {move.a === 0 ? '必中' : move.a}</span>
                  <span className="num">PP {move.pp}</span>
                  <span>{move.cz}</span>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-ink-dim">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={crit}
                    onChange={e => setCrit(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#002fa7]"
                  />
                  会心一击
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={burn}
                    onChange={e => setBurn(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#002fa7]"
                  />
                  灼伤（物理 ×0.5）
                </label>
                <div className="flex items-center gap-2">
                  <span className="label">WEATHER</span>
                  <select
                    aria-label="天气"
                    value={weather}
                    onChange={e => setWeather(e.target.value as Weather)}
                    className="h-7 border border-line-soft bg-paper px-1.5 text-[11px] outline-none focus:border-ink"
                  >
                    {WEATHERS.map(w => (
                      <option key={w.key} value={w.key}>
                        {w.zh}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-line-soft pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
              {!move && <div className="text-[12px] text-muted">选择招式后显示伤害…</div>}
              {move && move.p <= 0 && (
                <div className="text-[12px] text-ink-dim">变化招式，不造成直接伤害。</div>
              )}
              {damage?.summary && (
                <div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <div className="label">DAMAGE</div>
                      <div className="num text-[30px] leading-none text-ink">
                        {damage.summary.min}–{damage.summary.max}
                      </div>
                    </div>
                    <div>
                      <div className="label">对方 HP</div>
                      <div className="num text-[18px] leading-none text-ink-dim">{damage.hp}</div>
                    </div>
                    <div>
                      <div className="label">占比</div>
                      <div className="num text-[18px] leading-none text-ink-dim">
                        {Math.round((damage.summary.min / damage.hp) * 100)}–
                        {Math.round((damage.summary.max / damage.hp) * 100)}%
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="label">击杀</div>
                      <div className="text-[15px] font-medium text-ink">
                        {(() => {
                          const [minHits, maxHits] = koRange(damage.summary, damage.hp);
                          if (damage.summary.max >= damage.hp) {
                            return minHits === maxHits
                              ? `确定 ${minHits} 发`
                              : `随机 ${minHits}~${maxHits} 发`;
                          }
                          return `需要 ${minHits}~${maxHits} 发`;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full bg-surface-2">
                    <div
                      className="h-2 bg-brand"
                      style={{
                        width: `${Math.min(100, Math.round((damage.summary.max / damage.hp) * 100))}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="chip">
                      属性倍率 ×{damage.summary.effectiveness}
                    </span>
                    {damage.stab && <span className="chip">本系加成 ×1.5</span>}
                    <span className="chip">{damage.physical ? '物理' : '特殊'}</span>
                    <span className="chip num">
                      攻 {damage.atk} / 防 {damage.def}
                    </span>
                  </div>

                  {damage.summary.effectiveness === 0 && (
                    <p className="mt-2 text-[11px] text-brand">属性免疫，伤害为 0。</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 border-t border-line-soft pt-2 text-[10px] leading-relaxed text-muted">
            公式为第五世代以后的官方伤害公式（16 档随机数 85–100%），已计入属性相克、本系加成、会心、灼伤、天气与常用道具倍率。
            未计入特性（威吓、厚脂肪、技术高手等）、场地、光墙/反射壁与太晶化，结果仅作对比参考。
          </p>
        </div>
      )}
    </div>
  );
}

function MoveInput({
  moves,
  value,
  onChange,
}: {
  moves: (MoveRec & { id: string })[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const current = moves.find(m => m.id === value);
  const kw = q.trim().toLowerCase();
  const hits = kw
    ? moves.filter(m => m.n.toLowerCase().includes(kw) || m.e.toLowerCase().includes(kw)).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <input
        value={q}
        onChange={e => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={current ? `${current.n}（威力 ${current.p}）` : '输入招式名'}
        aria-label="招式"
        className="h-9 w-full border border-line-soft bg-bg px-2 text-[12px] text-ink outline-none placeholder:text-muted/80 focus:border-ink"
      />
      {open && hits.length > 0 && (
        <div className="absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-64 overflow-y-auto border border-line bg-paper">
          {hits.map(m => (
            <button
              key={m.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                onChange(m.id);
                setQ('');
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 border-b border-line-soft px-2 py-1.5 text-left transition last:border-b-0 hover:bg-surface-2"
            >
              <TypeIcon type={cap(m.t)} size={11} color={typeColor(cap(m.t))} />
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{m.n}</span>
              <span className="num shrink-0 text-[10px] text-muted">
                {m.p || '—'} / {m.cz}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}