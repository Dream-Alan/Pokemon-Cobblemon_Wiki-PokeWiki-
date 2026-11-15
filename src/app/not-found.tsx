import Link from 'next/link';
import { Pokeball } from '@/components/Pokeball';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70vh] flex-col justify-center py-16">
      <div className="grid gap-8 border-t border-line pt-8 md:grid-cols-12">
        <div className="md:col-span-7">
          <span className="label">ERROR 404 / 未找到</span>
          <h1 className="display mt-3 text-[clamp(3.5rem,12vw,9rem)] leading-[0.85] text-ink">
            404
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-dim">
            野生的 404 出现了！你要找的页面被放生了——可能是编号超出图鉴范围，
            或者攻略链接拼错了。
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link prefetch={false} href="/pokedex/" className="btn btn-primary">
              去图鉴看看 →
            </Link>
            <Link prefetch={false} href="/" className="btn">
              回首页
            </Link>
          </div>
        </div>
        <div className="flex items-start justify-end md:col-span-5">
          <Pokeball size={120} className="text-line-soft" />
        </div>
      </div>
    </div>
  );
}