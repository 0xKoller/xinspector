import { useEffect, useMemo } from "react";

type Theme = "light" | "dark" | "system";

const useTheme = (): [Theme, (mode: Theme) => void] => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return useMemo(() => ["dark" as Theme, () => {}], []);
};

export default useTheme;
