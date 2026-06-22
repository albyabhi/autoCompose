"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

interface TabsProps {
  defaultValue: string;
  labels?: Record<string, string>;
  children: ReactNode;
}

export function Tabs({ defaultValue, labels, children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">
        {labels && (
          <select
            className="tabs__select"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            aria-label="Settings section"
          >
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children }: { children: ReactNode }) {
  return (
    <div className="tabs__list" role="tablist">
      {children}
    </div>
  );
}

export function TabTrigger({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabTrigger must be used within a Tabs component");

  return (
    <button
      role="tab"
      aria-selected={ctx.activeTab === value}
      className={`tabs__trigger${ctx.activeTab === value ? " tabs__trigger--active" : ""}`}
      onClick={() => ctx.setActiveTab(value)}
    >
      {children}
    </button>
  );
}

export function TabContent({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabContent must be used within a Tabs component");

  return (
    <div role="tabpanel" className="tabs__content" hidden={ctx.activeTab !== value}>
      {children}
    </div>
  );
}
