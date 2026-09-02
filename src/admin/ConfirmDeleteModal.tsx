import React from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  itemName?: string;
  itemType?: string;
  description?: string;
  confirmLabel?: string;
  isDeleting?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  itemName,
  itemType = 'record',
  description,
  confirmLabel = 'Delete Permanently',
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="glass-container-solid rounded-[32px] max-w-md w-full p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)] border border-white overflow-hidden space-y-4"
        >
          {/* Top Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-300/30 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  {title}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Confirm destructive removal
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Item Highlight Callout */}
          {itemName && (
            <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-200/60 space-y-1">
              <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider block">
                Target {itemType}:
              </span>
              <p className="text-[13.5px] font-bold text-slate-900 break-words">
                {itemName}
              </p>
            </div>
          )}

          {/* Warning Message */}
          <div className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed bg-white/60 p-3.5 rounded-2xl border border-black/5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              {description ||
                `Are you sure you want to delete this ${itemType}? This action will permanently remove it from the system and linked student portals.`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2.5 rounded-2xl bg-black/5 hover:bg-black/10 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs font-bold shadow-md shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>{confirmLabel}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
