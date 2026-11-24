import { useEffect, useState } from 'react';

const KEY = 'color-scheme';
const readStored = () => {
  try { return localStorage.getItem(KEY) || 'system'; } catch { return 'system'; }
};
const systemQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

// The inline script in index.html applies the saved value before first paint; this keeps it in sync after.
export default function ThemeSetting() {
  const [choice, setChoice] = useState(readStored);
  const [systemDark, setSystemDark] = useState(() => systemQuery().matches);

  useEffect(() => {
    const query = systemQuery();
    const onSystem = (event) => setSystemDark(event.matches);
    const onStorage = (event) => { if (event.key === KEY || event.key === null) setChoice(readStored()); };
    query.addEventListener('change', onSystem);
    window.addEventListener('storage', onStorage);
    return () => {
      query.removeEventListener('change', onSystem);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', choice === 'system' ? 'light dark' : choice);
  }, [choice]);

  const select = (value) => {
    setChoice(value);
    try {
      if (value === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, value);
    } catch { /* site data blocked: the theme still applies for this visit */ }
  };

  const options = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: `System (currently ${systemDark ? 'dark' : 'light'})` },
  ];

  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">Color theme</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="cursor-pointer rounded-lg border border-hairline-strong px-3 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-base-200 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
        >
          <input
            type="radio"
            name="color-theme"
            value={option.value}
            checked={choice === option.value}
            onChange={() => select(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
