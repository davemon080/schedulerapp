import React, { useState } from 'react';
import { Task, TaskStatus, Priority, TeamMember } from '../types';
import {
  X,
  Clock,
  User,
  Tag,
  Trash2,
  CheckCircle2,
  Plus,
  Send,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

interface TaskDetailDrawerProps {
  task: Task | null;
  members: TeamMember[];
  onClose: () => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  members,
  onClose,
  onUpdateTask,
  onDeleteTask
}) => {
  if (!task) return null;

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  const handleToggleSubtask = (subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    onUpdateTask({
      ...task,
      subtasks: updatedSubtasks
    });
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const newSubtask = {
      id: `st-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false
    };
    onUpdateTask({
      ...task,
      subtasks: [...task.subtasks, newSubtask]
    });
    setNewSubtaskTitle('');
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    onUpdateTask({
      ...task,
      subtasks: task.subtasks.filter((st) => st.id !== subtaskId)
    });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment = {
      id: `c-${Date.now()}`,
      author: 'Alex Chen',
      avatar: '/src/assets/images/avatar_alex_chen_1790263298476.jpg',
      text: newCommentText.trim(),
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    onUpdateTask({
      ...task,
      comments: [...task.comments, newComment]
    });
    setNewCommentText('');
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl h-full bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-neutral-400">
              {task.id}
            </span>
            <span aria-hidden="true" className="text-neutral-700">·</span>
            <span className="text-xs text-neutral-400 font-mono">
              Created {task.createdAt}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm('Delete this task?')) {
                  onDeleteTask(task.id);
                  onClose();
                }
              }}
              className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title & Description */}
          <div>
            <h2 className="text-lg font-bold text-white mb-2 leading-snug">
              {task.title}
            </h2>
            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/50 p-3 rounded-lg border border-neutral-800">
              {task.description || 'No description provided.'}
            </p>
          </div>

          {/* Quick Properties Matrix */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-neutral-950/60 p-4 rounded-xl border border-neutral-800">
            <div>
              <span className="text-neutral-500 font-mono block mb-1">Status</span>
              <select
                value={task.status}
                onChange={(e) =>
                  onUpdateTask({ ...task, status: e.target.value as TaskStatus })
                }
                className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="backlog">Backlog</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <span className="text-neutral-500 font-mono block mb-1">Priority</span>
              <select
                value={task.priority}
                onChange={(e) =>
                  onUpdateTask({ ...task, priority: e.target.value as Priority })
                }
                className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <span className="text-neutral-500 font-mono block mb-1">Assignee</span>
              <select
                value={task.assignee.name}
                onChange={(e) => {
                  const m = members.find((mem) => mem.name === e.target.value);
                  if (m) {
                    onUpdateTask({
                      ...task,
                      assignee: {
                        name: m.name,
                        role: m.role,
                        avatar: m.avatar
                      }
                    });
                  }
                }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-neutral-500 font-mono block mb-1">Story Points</span>
              <input
                type="number"
                min="1"
                max="21"
                value={task.points}
                onChange={(e) =>
                  onUpdateTask({ ...task, points: parseInt(e.target.value) || 1 })
                }
                className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Subtasks / Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                Checklist ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
              </h3>
            </div>

            <div className="space-y-1.5 mb-3">
              {task.subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/40 border border-neutral-800/80 group"
                >
                  <label className="flex items-center gap-2.5 text-xs cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => handleToggleSubtask(st.id)}
                      className="rounded border-neutral-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-neutral-900"
                    />
                    <span
                      className={
                        st.completed ? 'line-through text-neutral-500' : 'text-neutral-200'
                      }
                    >
                      {st.title}
                    </span>
                  </label>
                  <button
                    onClick={() => handleDeleteSubtask(st.id)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-rose-400 p-1 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddSubtask} className="flex gap-2">
              <input
                type="text"
                placeholder="Add subtask item..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
              >
                Add
              </button>
            </form>
          </div>

          {/* Activity / Comments */}
          <div className="pt-4 border-t border-neutral-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-3 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              Activity & Comments
            </h3>

            <div className="space-y-3 mb-4">
              {task.comments.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">No comments yet.</p>
              ) : (
                task.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={comment.avatar}
                          alt={comment.author}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span className="font-semibold text-neutral-200">
                          {comment.author}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {comment.createdAt}
                      </span>
                    </div>
                    <p className="text-neutral-300 leading-relaxed pl-6">
                      {comment.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Write a comment or update..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                <span>Post</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
