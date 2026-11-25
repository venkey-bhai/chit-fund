
'use client';

import { useState, useEffect, useRef } from 'react';
import { CalendarDays } from 'lucide-react';

// Date field that always shows dd/mm/yyyy regardless of browser locale.
// `value` is an ISO (yyyy-mm-dd) string; `onChange` receives an event-like { target: { value } }
// (ISO string), exactly like <input type="date">, so callers can use e.target.value.
function isoToDisplay(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function displayToIso(text) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return '';
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (d.getFullYear() !== Number(yyyy) || d.getMonth() !== Number(mm) - 1 || d.getDate() !== Number(dd)) return '';
  return `${yyyy}-${mm}-${dd}`;
}

export default function DateInput({ value, onChange, required, className = '', ...rest }) {
  const [text, setText] = useState(isoToDisplay(value));
  const pickerRef = useRef(null);

  // Sync when the parent changes the value (e.g. end date auto-calculated)
  useEffect(() => {
    if (value !== displayToIso(text)) setText(isoToDisplay(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    let out = digits;
    if (digits.length > 4) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setText(out);
    onChange?.({ target: { value: displayToIso(out) } });
  }

  return (
    <div className="relative">
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        maxLength={10}
        required={required}
        value={text}
        onChange={handleChange}
        pattern="\d{2}/\d{2}/\d{4}"
        title="Enter date as dd/mm/yyyy"
        className={`${className} pr-7`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => pickerRef.current?.showPicker?.()}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
        aria-label="Open calendar"
      >
        <CalendarDays className="w-3.5 h-3.5" />
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        value={value || ''}
        onChange={(e) => onChange?.({ target: { value: e.target.value } })}
        className="absolute right-0 bottom-0 w-0 h-0 opacity-0 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
