import React from 'react';
import { motion } from 'motion/react';
import { NavigationTab } from '../types';
import { CalendarDays, Clock, Radio, BookMarked, User } from 'lucide-react';

interface BottomNavBarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

interface NavItemConfig {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'Schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'Deadlines', label: 'Deadlines', icon: Clock },
  { id: 'Broadcasts', label: 'Broadcasts', icon: Radio },
  { id: 'Modules', label: 'Modules', icon: BookMarked },
  { id: 'Profile', label: 'Profile', icon: User },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-4 pt-2 pointer-events-none">
      <div className="w-full max-w-md glass-container-solid rounded-[32px] px-2 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-white flex items-center justify-between pointer-events-auto backdrop-blur-2xl bg-white/85">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              whileTap={{ scale: 0.92 }}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-[20px] cursor-pointer relative group transition-colors duration-200 ${
                isActive ? 'text-[#007AFF]' : 'text-[#8E8E93] hover:text-[#1C1C1E]'
              }`}
            >
              {/* Active Tab Sliding Pill with Layout Animation */}
              {isActive && (
                <motion.div
                  layoutId="activeNavPill"
                  transition={{ type: 'spring', damping: 26, stiffness: 360 }}
                  className="absolute inset-0 bg-blue-500/12 rounded-[18px] border border-blue-400/25 shadow-2xs -z-10"
                />
              )}

              <motion.div
                animate={{
                  scale: isActive ? 1.08 : 1,
                  y: isActive ? -1 : 0,
                }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                <Icon
                  className={`w-[20px] h-[20px] ${
                    isActive ? 'text-[#007AFF]' : 'group-hover:text-slate-800'
                  }`}
                />
              </motion.div>

              <span
                className={`text-[10.5px] mt-0.5 tracking-tight text-center truncate w-full transition-all duration-150 ${
                  isActive ? 'font-bold text-[#007AFF]' : 'font-medium text-[#8E8E93]'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
