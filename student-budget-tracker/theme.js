const THEME_PREFERENCE_KEY = "studentBudgetTheme";
const systemThemeQuery =
  window.matchMedia?.("(prefers-color-scheme: dark)") || null;

function getThemePreference() {
  try {
    const preference = localStorage.getItem(THEME_PREFERENCE_KEY);
    return ["system", "light", "dark"].includes(preference)
      ? preference
      : "system";
  } catch {
    return "system";
  }
}

function applyThemePreference(preference) {
  const normalizedPreference = ["system", "light", "dark"].includes(preference)
    ? preference
    : "system";
  const theme =
    normalizedPreference === "system"
      ? systemThemeQuery?.matches
        ? "dark"
        : "light"
      : normalizedPreference;

  document.documentElement.dataset.themePreference = normalizedPreference;
  document.documentElement.dataset.theme = theme;

  document
    .querySelectorAll('input[name="theme-preference"]')
    .forEach((input) => {
      input.checked = input.value === normalizedPreference;
    });
}

function saveThemePreference(preference) {
  if (!["system", "light", "dark"].includes(preference)) return;

  try {
    localStorage.setItem(THEME_PREFERENCE_KEY, preference);
  } catch {
    // Keep the current page theme even when browser storage is unavailable.
  }
  applyThemePreference(preference);
}

applyThemePreference(getThemePreference());

document.querySelectorAll('input[name="theme-preference"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (input.checked) saveThemePreference(input.value);
  });
});

if (systemThemeQuery) {
  const handleSystemThemeChange = () => {
    if (getThemePreference() === "system") applyThemePreference("system");
  };
  if (systemThemeQuery.addEventListener) {
    systemThemeQuery.addEventListener("change", handleSystemThemeChange);
  } else {
    systemThemeQuery.addListener(handleSystemThemeChange);
  }
}
