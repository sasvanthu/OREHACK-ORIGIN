import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LogoSection } from "./navbar/LogoSection";
import { CenterSection } from "./navbar/CenterSection";
import { ActionButtons } from "./navbar/ActionButtons";
import styles from "./navbar/Navbar.module.css";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [progress, setProgress] = useState(0);

  // Handle scroll event
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      // Update progress based on scroll
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = (window.scrollY / totalHeight) * 100;
      setProgress(Math.min(scrollProgress, 100));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Close menu on route change
  const handleNavClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-card/95 backdrop-blur-xl border-b border-border/40 shadow-lg " +
              styles.scrolled
            : "bg-gradient-to-b from-background/80 via-background/40 to-transparent"
        }`}
      >
        {/* Main navbar container */}
        <div className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 lg:px-12 max-w-7xl mx-auto w-full">
          {/* Logo Section */}
          <LogoSection />

          {/* Center Section - Hidden on mobile menu */}
          <div className="flex-1 flex justify-center">
            <CenterSection
              theme={theme}
              setTheme={setTheme}
              progress={progress}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0">
            <ActionButtons />
          </div>
        </div>
      </motion.nav>

      {/* Navbar spacing */}
      <div className="h-16 md:h-20" />
    </>
  );
};

export default Navbar;
