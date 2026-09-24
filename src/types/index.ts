export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'backlog' | 'in_progress' | 'in_review' | 'completed';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee: {
    name: string;
    role: string;
    avatar: string;
  };
  dueDate: string;
  tags: string[];
  points: number;
  subtasks: Subtask[];
  comments: TaskComment[];
  createdAt: string;
}

export interface CanvasNode {
  id: string;
  type: 'card' | 'sticky' | 'asset' | 'decision';
  title: string;
  description?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  image?: string;
  tags?: string[];
  status?: string;
}

export interface CanvasConnection {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  color?: string;
}

export interface WorkspaceDoc {
  id: string;
  title: string;
  category: 'Specs' | 'RFC' | 'Sprint' | 'Notes';
  lastEdited: string;
  author: string;
  content: string;
}

export interface CreativeAsset {
  id: string;
  title: string;
  category: 'UI Mockup' | 'Brand' | 'System' | 'Illustration';
  image: string;
  dimensions: string;
  author: string;
  updatedAt: string;
  description: string;
  tags: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  activeTasksCount: number;
  timezone: string;
}
