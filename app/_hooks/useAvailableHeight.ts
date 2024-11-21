import { useState, useEffect, RefObject } from "react";

export const useAvailableHeight = (navbarRef: RefObject<HTMLDivElement>) => {
  const [availableHeight, setAvailableHeight] = useState(0);

  useEffect(() => {
    const calculateHeight = () => {
      if (!navbarRef.current) return;

      const navHeight = navbarRef.current.offsetHeight;
      const windowHeight = window.innerHeight;
      setAvailableHeight(windowHeight - navHeight);
    };

    // Initial calculation
    calculateHeight();

    // Recalculate on window resize
    window.addEventListener("resize", calculateHeight);

    // Cleanup
    return () => window.removeEventListener("resize", calculateHeight);
  }, [navbarRef]);

  return availableHeight;
};
