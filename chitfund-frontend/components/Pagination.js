'use client';

// Page list like: prev 1 2 ... 9 10 next (always keeps first/last, a window around current)
function getPageItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const items = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push('...');
    items.push(p);
  });
  return items;
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const items = getPageItems(page, totalPages);
  const base = 'min-w-[28px] h-7 px-2 rounded-full text-xs font-semibold flex items-center justify-center transition-colors';

  return (
    <nav aria-label="Pagination" className="flex justify-center py-2 shrink-0">
      <div className="inline-flex items-center gap-1 bg-slate-100 rounded-full px-2 py-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className={`${base} text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          prev
        </button>
        {items.map((item, i) =>
          item === '...' ? (
            <span key={`dots-${i}`} className="px-1 text-slate-500 font-bold select-none">
              &hellip;
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={`${base} ${
                item === page ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className={`${base} text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          next
        </button>
      </div>
    </nav>
  );
}
