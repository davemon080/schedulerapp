import React from 'react';
import { motion } from 'motion/react';
import { NavigationTab } from '../types';
import { CalendarDays, Clock, Radio, BookMarked, User, Lock } from 'lucide-react';

interface BottomNavBarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isPaid?: boolean;
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

export const BottomNavBar: React.FC<BottomNavBarProps> = React.memo(({
  activeTab,
  onSelectTab,
  isPaid = true,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-2.5 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-0.5 pointer-events-none">
      <div className="w-full max-w-[440px] sm:max-w-[480px] md:max-w-[500px] glass-container-solid rounded-[20px] sm:rounded-[22px] px-1 py-0.5 shadow-[0_6px_24px_rgba(0,0,0,0.08)] border border-white flex items-center justify-between pointer-events-auto backdrop-blur-2xl bg-white/90">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isLocked = !isPaid && item.id !== 'Profile';

          return (
            <motion.button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              whileTap={{ scale: 0.92 }}
              className={`flex flex-col items-center justify-center flex-1 py-0.5 px-0.5 rounded-[12px] sm:rounded-[14px] cursor-pointer relative group transition-colors duration-200 min-h-[34px] sm:min-h-[38px] touch-target ${
                isActive ? 'text-[#007AFF]' : 'text-[#8E8E93] hover:text-[#1C1C1E]'
              }`}
            >
              {/* Active Tab Sliding Pill with Layout Animation */}
              {isActive && (
                <motion.div
                  layoutId="activeNavPill"
                  transition={{ type: 'spring', damping: 26, stiffness: 360 }}
                  className="absolute inset-0 bg-blue-500/12 rounded-[11px] sm:rounded-[13px] border border-blue-400/25 shadow-2xs -z-10"
                />
              )}

              <div className="relative">
                <motion.div
                  animate={{
                    scale: isActive ? 1.05 : 1,
                    y: isActive ? -0.5 : 0,
                  }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                >
                  <Icon
                    className={`w-[15px] h-[15px] sm:w-[17px] sm:h-[17px] ${
                      isActive ? 'text-[#007AFF]' : 'group-hover:text-slate-800'
                    }`}
                  />
                </motion.div>

                {isLocked && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Lock className="w-1.5 h-1.5 stroke-[2.5]" />
                  </span>
                )}
              </div>

              <span
                className={`text-[8px] sm:text-[8.5px] mt-0.5 tracking-tight text-center truncate w-full transition-all duration-150 ${
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
});
