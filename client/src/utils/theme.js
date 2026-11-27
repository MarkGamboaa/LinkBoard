// Theme choice is per device ("system" follows the OS). index.html applies it before first paint.
export const THEME_KEY = "linkboard:theme";

export const readTheme = () => {
  try {
    const choice = localStorage.getItem(THEME_KEY);
    return choice === "light" || choice === "dark" ? choice : "system";
  } catch {
    return "system";
  }
};

export const setTheme = (choice) => {
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch { /* storage blocked: choice lasts this visit */ }
  const dark = choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
};
