import React from 'react';

interface SkeletonBoxProps {
  className?: string;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative overflow-hidden bg-slate-200/60 rounded-xl animate-pulse ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-[shimmer_1.8s_infinite]" />
    </div>
  );
};

export const ActivitiesSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Title placeholder */}
      <div className="flex items-center justify-between px-1">
        <div className="space-y-2">
          <SkeletonBox className="h-6 w-44 rounded-lg" />
          <SkeletonBox className="h-4 w-32 rounded-md" />
        </div>
        <SkeletonBox className="h-6 w-28 rounded-full" />
      </div>

      {/* 3 Activity Cards */}
      <div className="space-y-3.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-container rounded-[26px] p-5 sm:p-6 space-y-4 border border-white/80"
          >
            {/* Top Row: Course badge & 3-dot button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SkeletonBox className="h-6 w-20 rounded-full bg-blue-100/70" />
                {i === 2 && <SkeletonBox className="h-5 w-24 rounded-full bg-amber-100/70" />}
              </div>
              <SkeletonBox className="h-7 w-7 rounded-full bg-slate-200/50" />
            </div>

            {/* Course Title & Code */}
            <div className="space-y-2">
              <SkeletonBox className="h-5 w-3/4 rounded-md" />
              <SkeletonBox className="h-4 w-1/2 rounded-md" />
            </div>

            {/* Time & Venue Tags */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <SkeletonBox className="h-8 w-36 rounded-[14px]" />
              <SkeletonBox className="h-8 w-44 rounded-[14px]" />
            </div>

            {/* Action Bar */}
            <div className="pt-2 border-t border-black/5 flex items-center justify-between">
              <SkeletonBox className="h-4 w-28 rounded-md" />
              <SkeletonBox className="h-8 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DayTimelineSkeleton: React.FC = () => {
  return (
    <div className="glass-container rounded-[24px] py-3 px-3.5 sm:px-4 border border-white/80 space-y-2.5">
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-5 w-36 rounded-md" />
        <SkeletonBox className="h-5 w-14 rounded-full" />
      </div>
      <div className="flex items-center gap-2 overflow-x-hidden py-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-[64px] h-[72px] rounded-[16px] p-2 flex flex-col items-center justify-between border ${
              i === 2
                ? 'bg-blue-500/20 border-blue-300/40'
                : 'bg-white/40 border-white/50'
            }`}
          >
            <SkeletonBox className="h-3 w-8 rounded-sm" />
            <SkeletonBox className="h-5 w-6 rounded-md" />
            <SkeletonBox className="h-2.5 w-10 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const DeadlinesSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-6 w-48 rounded-lg" />
        <SkeletonBox className="h-6 w-24 rounded-full" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-container rounded-[24px] p-5 flex items-start justify-between gap-3 border border-white/80"
          >
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center gap-2">
                <SkeletonBox className="h-5 w-16 rounded-full" />
                <SkeletonBox className="h-5 w-14 rounded-full" />
              </div>
              <SkeletonBox className="h-5 w-4/5 rounded-md" />
              <SkeletonBox className="h-4 w-32 rounded-md" />
            </div>
            <SkeletonBox className="w-8 h-8 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const BroadcastsSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-6 w-44 rounded-lg" />
        <SkeletonBox className="h-4 w-28 rounded-md" />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="glass-container rounded-[24px] p-5 space-y-3 border border-white/80"
          >
            <div className="flex items-center justify-between">
              <SkeletonBox className="h-4 w-36 rounded-md" />
              <SkeletonBox className="h-3 w-16 rounded-md" />
            </div>
            <SkeletonBox className="h-5 w-3/4 rounded-md" />
            <SkeletonBox className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ModulesSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <SkeletonBox className="h-6 w-40 rounded-lg" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="glass-container rounded-[22px] p-4 flex items-center justify-between border border-white/80"
          >
            <div className="flex items-center gap-3 flex-1">
              <SkeletonBox className="w-10 h-10 rounded-[14px]" />
              <div className="space-y-1.5 flex-1">
                <SkeletonBox className="h-4 w-2/3 rounded-md" />
                <SkeletonBox className="h-3 w-1/3 rounded-md" />
              </div>
            </div>
            <SkeletonBox className="w-4 h-4 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <SkeletonBox className="h-6 w-36 rounded-lg" />
      <div className="glass-container rounded-[28px] p-6 text-center space-y-3 border border-white/80 flex flex-col items-center">
        <SkeletonBox className="w-24 h-24 rounded-full" />
        <SkeletonBox className="h-6 w-40 rounded-md" />
        <SkeletonBox className="h-4 w-52 rounded-md" />
        <div className="flex gap-2 pt-2">
          <SkeletonBox className="h-6 w-28 rounded-full" />
          <SkeletonBox className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <div className="glass-container rounded-[26px] p-5 space-y-3 border border-white/80">
        <div className="flex justify-between py-1">
          <SkeletonBox className="h-4 w-20 rounded-md" />
          <SkeletonBox className="h-4 w-28 rounded-md" />
        </div>
        <div className="flex justify-between py-1">
          <SkeletonBox className="h-4 w-28 rounded-md" />
          <SkeletonBox className="h-4 w-36 rounded-md" />
        </div>
      </div>
    </div>
  );
};

export const NotificationsSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 pb-36 pt-2">
      <div className="flex items-center justify-between px-1">
        <SkeletonBox className="h-8 w-24 rounded-full" />
        <SkeletonBox className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-10 h-10 rounded-[18px]" />
        <SkeletonBox className="h-7 w-60 rounded-md" />
      </div>
      <div className="glass-container rounded-[22px] p-1.5 border border-white/80 flex gap-2">
        <SkeletonBox className="h-8 flex-1 rounded-[16px]" />
        <SkeletonBox className="h-8 flex-1 rounded-[16px]" />
        <SkeletonBox className="h-8 flex-1 rounded-[16px]" />
      </div>
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-container rounded-[24px] p-4 flex items-start gap-3.5 border border-white/70"
          >
            <SkeletonBox className="w-9 h-9 rounded-2xl shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="flex justify-between">
                <SkeletonBox className="h-4 w-40 rounded-md" />
                <SkeletonBox className="w-3 h-3 rounded-full" />
              </div>
              <SkeletonBox className="h-3.5 w-full rounded-md" />
              <SkeletonBox className="h-3.5 w-2/3 rounded-md" />
              <div className="flex justify-between pt-2">
                <SkeletonBox className="h-3 w-16 rounded-md" />
                <SkeletonBox className="h-4 w-20 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
