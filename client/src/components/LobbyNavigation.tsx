"use client";
import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Tab {
  title: string;
  icon: React.ReactNode;
  type?: never;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
}

type TabItem = Tab | Separator;

interface LobbyNavigationProps {
  tabs: TabItem[];
  className?: string;
  onChange?: (index: number | null) => void;
  activeIndex?: number | null;
}

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: {
    width: "auto",
    opacity: 1,
    transition: { delay: 0.05, duration: 0.2, ease: "easeOut" as const },
  },
  exit: {
    width: 0,
    opacity: 0,
    transition: { duration: 0.1, ease: "easeIn" as const },
  },
};

export const LobbyNavigation: React.FC<LobbyNavigationProps> = ({
  tabs,
  className,
  onChange,
  activeIndex: controlledActiveIndex
}) => {
  const [selected, setSelected] = useState<number | null>(controlledActiveIndex !== undefined ? controlledActiveIndex : 0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with controlled activeIndex if provided
  useEffect(() => {
    if (controlledActiveIndex !== undefined && controlledActiveIndex !== selected) {
      setSelected(controlledActiveIndex);
    }
  }, [controlledActiveIndex, selected]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setSelected(null);
        if (onChange) onChange(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onChange]);

  const handleSelect = (index: number) => {
    setSelected(index);
    if (onChange) onChange(index);
  };

  const SeparatorComponent = () => (
    <div
      className="h-7 w-px bg-slate-200 dark:bg-slate-700"
      style={{ backgroundColor: 'rgba(147, 51, 234, 0.3)' }}
      aria-hidden="true"
    />
  );

  return (
    <div
      ref={containerRef}
      className={`flex items-center gap-1 rounded-full border p-1 shadow-md backdrop-blur-sm ${className || ""}`}
      style={{
        borderColor: 'rgba(147, 51, 234, 0.3)',
        backgroundColor: 'rgba(11, 15, 20, 0.7)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {tabs.map((tab, index) => {
        if (tab.type === "separator") {
          return <SeparatorComponent key={`separator-${index}`} />;
        }

        const isSelected = selected === index;

        return (
          <button
            key={tab.title}
            onClick={() => handleSelect(index)}
            className={`relative z-10 flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none`}
            style={{
              color: isSelected
                ? '#a78bfa'
                : 'rgba(165, 174, 188, 0.8)',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.color = 'rgba(147, 51, 234, 0.9)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.color = 'rgba(165, 174, 188, 0.8)';
              }
            }}
          >
            {isSelected && (
              <motion.div
                layoutId="pill"
                className="absolute inset-0 z-0 rounded-full backdrop-blur-sm border shadow-sm"
                style={{
                  backgroundColor: 'rgba(147, 51, 234, 0.2)',
                  borderColor: 'rgba(147, 51, 234, 0.4)',
                  boxShadow: '0 0 20px rgba(147, 51, 234, 0.3)',
                }}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}

            <span className="relative z-10 flex items-center gap-2">
              <span className="flex-shrink-0">{tab.icon}</span>
              <AnimatePresence initial={false}>
                {isSelected && (
                  <motion.span
                    variants={spanVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {tab.title}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </button>
        );
      })}
    </div>
  );
};
