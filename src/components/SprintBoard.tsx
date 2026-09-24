import React, { useState } from 'react';
import { Task, TaskStatus, Priority } from '../types';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  MoreHorizontal,
  ChevronRight,
  ListTodo,
  MessageSquare
} from 'lucide-react';

interface SprintBoardProps {
  tasks: Task[];
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
  onOpenNewTask: (defaultStatus?: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; label: string; dotColor: string }[] = [
  { id: 'backlog', label: 'Backlog', dotColor: 'bg-neutral-500' },
  { id: 'in_progress', label: 'In Progress', dotColor: 'bg-amber-400' },
  { id: 'in_review', label: 'In Review', dotColor: 'bg-indigo-400' },
  { id: 'completed', label: 'Completed', dotColor: 'bg-emerald-400' }
];

export const SprintBoard: React.FC<SprintBoardProps> = ({
  tasks,
  onUpdateTaskStatus,
  onSelectTask,
  onOpenNewTask
}) => {
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Collect unique assignees
  const assignees = Array.from(new Set(tasks.map((t) => t.assignee.name)));

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.description.toLowerCase().includes(search.toLowerCase()) ||
      task.id.toLowerCase().includes(search.toLowerCase()) ||
      task.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === 'all' || task.assignee.name === assigneeFilter;

    return matchesSearch && matchesPriority && matchesAssignee;
  });

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            High
          </span>
        );
      case 'medium':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-sky-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-500"></span>
            Low
          </span>
        );
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      onUpdateTaskStatus(taskId, targetStatus);
    }
    setDraggedTaskId(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-950">
      {/* Control Bar: Filters & Search */}
      <div className="px-6 py-3.5 border-b border-neutral-800 bg-neutral-900/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter tasks, tags, or keys (e.g. TSK-101)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-900/80 border border-neutral-800 rounded-lg text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <Filter className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-neutral-500">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-md px-2 py-1 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span className="text-neutral-500">Assignee:</span>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-md px-2 py-1 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Team Members</option>
              {assignees.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {(search || priorityFilter !== 'all' || assigneeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setPriorityFilter('all');
                setAssigneeFilter('all');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-4 ml-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Board Columns Canvas */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full min-w-[960px]">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            const totalPoints = colTasks.reduce((acc, curr) => acc + (curr.points || 0), 0);

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="flex flex-col bg-neutral-900/40 border border-neutral-800/80 rounded-xl overflow-hidden shadow-xs hover:border-neutral-700/60 transition-colors"
              >
                {/* Column Header */}
                <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`}></span>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
                      {col.label}
                    </h3>
                    <span className="text-[11px] font-mono text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-800/80">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
                      {totalPoints} pts
                    </span>
                    <button
                      onClick={() => onOpenNewTask(col.id)}
                      className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                      title={`Add task to ${col.label}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Column Body: Tasks List */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
                  {colTasks.length === 0 ? (
                    <div className="h-32 border border-dashed border-neutral-800/70 rounded-lg flex flex-col items-center justify-center text-center p-4">
                      <p className="text-xs text-neutral-400">No tasks in this lane</p>
                      <button
                        onClick={() => onOpenNewTask(col.id)}
                        className="mt-2 text-xs font-medium text-indigo-400 hover:text-indigo-300"
                      >
                        + Add new item
                      </button>
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => onSelectTask(task)}
                          className="group relative p-3.5 bg-neutral-900/90 hover:bg-neutral-800/80 border border-neutral-800/80 hover:border-neutral-700 rounded-lg shadow-sm cursor-grab active:cursor-grabbing transition-all select-none"
                        >
                          {/* Top Row: Key + Priority */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-mono text-[11px] text-neutral-400 tracking-wide">
                              {task.id}
                            </span>
                            {getPriorityBadge(task.priority)}
                          </div>

                          {/* Task Title */}
                          <h4 className="text-sm font-semibold text-neutral-100 group-hover:text-white leading-snug line-clamp-2 mb-2">
                            {task.title}
                          </h4>

                          {/* Task Description Preview */}
                          {task.description && (
                            <p className="text-xs text-neutral-400 line-clamp-2 mb-3">
                              {task.description}
                            </p>
                          )}

                          {/* Tags: clean unboxed styling */}
                          {task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {task.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] text-neutral-400 font-mono tracking-tight bg-neutral-800/50 px-1.5 py-0.5 rounded border border-neutral-800"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Progress bar if subtasks exist */}
                          {task.subtasks.length > 0 && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1 font-mono">
                                <span className="flex items-center gap-1">
                                  <ListTodo className="w-3 h-3 text-neutral-500" />
                                  Checklist
                                </span>
                                <span className="tabular-nums">
                                  {completedSubtasks}/{task.subtasks.length}
                                </span>
                              </div>
                              <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 transition-all duration-300"
                                  style={{
                                    width: `${(completedSubtasks / task.subtasks.length) * 100}%`
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}

                          {/* Bottom Row: Metadata & Assignee */}
                          <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 text-neutral-400 text-[11px] font-mono">
                              <span className="flex items-center gap-1" title="Due Date">
                                <Clock className="w-3 h-3 text-neutral-500" />
                                {task.dueDate.slice(5)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-neutral-300 tabular-nums">
                                {task.points} pts
                              </span>
                              {task.comments.length > 0 && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="flex items-center gap-0.5 text-neutral-400">
                                    <MessageSquare className="w-3 h-3 text-neutral-500" />
                                    {task.comments.length}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5" title={task.assignee.name}>
                              <img
                                src={task.assignee.avatar}
                                alt={task.assignee.name}
                                className="w-5 h-5 rounded-full object-cover border border-neutral-700"
                              />
                            </div>
                          </div>

                          {/* Quick lane transition buttons on hover */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-neutral-900/95 p-1 rounded-md border border-neutral-700 shadow-md">
                            {col.id !== 'backlog' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const prev: Record<TaskStatus, TaskStatus> = {
                                    backlog: 'backlog',
                                    in_progress: 'backlog',
                                    in_review: 'in_progress',
                                    completed: 'in_review'
                                  };
                                  onUpdateTaskStatus(task.id, prev[col.id]);
                                }}
                                className="text-[10px] text-neutral-400 hover:text-white px-1 py-0.5 rounded hover:bg-neutral-800"
                                title="Move Left"
                              >
                                ←
                              </button>
                            )}
                            {col.id !== 'completed' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const next: Record<TaskStatus, TaskStatus> = {
                                    backlog: 'in_progress',
                                    in_progress: 'in_review',
                                    in_review: 'completed',
                                    completed: 'completed'
                                  };
                                  onUpdateTaskStatus(task.id, next[col.id]);
                                }}
                                className="text-[10px] text-indigo-400 hover:text-white px-1 py-0.5 rounded hover:bg-neutral-800"
                                title="Move Right"
                              >
                                →
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
