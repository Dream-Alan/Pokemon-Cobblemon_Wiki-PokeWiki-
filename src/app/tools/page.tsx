import type { Metadata } from 'next';
import { BattleCalc } from '@/components/BattleCalc';

export const metadata: Metadata = {
  title: '对战小工具 · 速度线与伤害计算',
  description:
    '宝可梦速度线对比与伤害计算器：输入等级、性格、努力值与道具，估算先手顺序与击杀所需回合数，数据全部本地计算。',
};

export default function ToolsPage() {
  return (
    <div className="container-page py-8">
      <section className="border-b border-line pb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="label">04 — Tools / 工具</span>
            <h1 className="display mt-2 text-[clamp(2rem,5vw,3.2rem)] text-ink">对战小工具</h1>
          </div>
          <div className="num text-[11px] leading-relaxed text-muted">
            <div>SPEED LINE</div>
            <div>DAMAGE CALC</div>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-dim">
          两个常用计算：<span className="border-b border-line px-0.5">速度线</span>
          判断两只宝可梦谁先出手，<span className="border-b border-line px-0.5">伤害计算</span>
          估算一发招式能打掉多少血、几发能击倒。全部在浏览器本地计算，不联网、不收集数据。
        </p>
      </section>

      <div className="mt-6">
        <BattleCalc />
      </div>

      <section className="mt-8 border-t border-line pt-4">
        <h2 className="section-title mb-2">计算口径</h2>
        <ul className="grid gap-1.5 text-[12px] leading-relaxed text-ink-dim md:grid-cols-2">
          <li>· 个体值固定按 31（满个体）计算，努力值上限 252。</li>
          <li>· 伤害取第五世代以后的公式，16 档随机数（85%–100%）。</li>
          <li>· 已计入：属性相克、本系加成、会心（×1.5）、灼伤、天气、常用道具倍率。</li>
          <li>· 未计入：特性、场地、光墙/反射壁、太晶化与多目标衰减。</li>
        </ul>
      </section>
    </div>
  );
}