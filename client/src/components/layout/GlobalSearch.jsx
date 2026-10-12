import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { searchService } from "@/services/searchService";

export default function GlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const term = useDebounce(value, 300).trim();
  const enabled = term.length >= 2;

  const { data: groups = [], isFetching } = useQuery({
    queryKey: ["search", term],
    queryFn: () => searchService.search(term),
    enabled,
    staleTime: 15_000,
  });

  const flat = groups.flatMap((g) => g.items.map((item) => ({ ...item, type: g.type })));

  // Ctrl / Cmd + K focuses the box
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // click outside closes
  useEffect(() => {
    const onDown = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = (item) => {
    navigate(item.to);
    setValue("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown" && flat.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp" && flat.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter" && flat[active]) {
      e.preventDefault();
      go(flat[active]);
    }
  };

  let index = -1;

  return (
    <div ref={boxRef} className="relative hidden max-w-md flex-1 sm:block">
      <svg className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search vehicle, driver, customer, trip, bill…"
        aria-label="Search everything"
        className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-14 text-[15px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-green-800 focus:ring-2 focus:ring-green-800/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-green-500 dark:focus:ring-green-500/30"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-gray-300 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Ctrl K
      </kbd>

      {open && value.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
          {!enabled && <p className="px-4 py-3 text-sm text-gray-500">Type at least 2 characters…</p>}
          {enabled && isFetching && flat.length === 0 && <p className="px-4 py-3 text-sm text-gray-500">Searching…</p>}
          {enabled && !isFetching && flat.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-500">Nothing found for “{term}”.</p>
          )}

          {groups.map((g) => (
            <div key={g.type} className="border-b border-gray-100 py-1 last:border-0 dark:border-gray-800">
              <p className="px-4 pb-1 pt-2 text-[13px] font-semibold text-gray-500 dark:text-gray-400">{g.label}</p>
              {g.items.map((item) => {
                index += 1;
                const i = index;
                return (
                  <button
                    key={`${g.type}-${item.id}`}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(item)}
                    className={`block w-full px-4 py-2 text-left ${active === i ? "bg-green-50 dark:bg-green-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                  >
                    <p className="truncate text-[15px] font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                    {item.subtitle && <p className="truncate text-[13px] text-gray-500 dark:text-gray-400">{item.subtitle}</p>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}