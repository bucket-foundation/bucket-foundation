import { useEffect, useState } from "react";

export function useSceneTheme() {
  const read = () => {
    const style = getComputedStyle(document.documentElement);
    return {
      paper: style.getPropertyValue("--paper").trim(),
      ink: style.getPropertyValue("--ink").trim(),
      muted: style.getPropertyValue("--ink-2").trim(),
      accent: style.getPropertyValue("--accent").trim(),
    };
  };
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setTheme(read());
    media.addEventListener("change", update);
    update();
    return () => media.removeEventListener("change", update);
  }, []);
  return theme;
}
