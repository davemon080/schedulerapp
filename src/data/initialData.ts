import { Task, CanvasNode, CanvasConnection, WorkspaceDoc, CreativeAsset, TeamMember } from '../types';

export const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: 'user_alex',
    name: 'Alex Chen',
    role: 'Principal Product Designer',
    avatar: '/src/assets/images/avatar_alex_chen_1790263298476.jpg',
    activeTasksCount: 4,
    timezone: 'UTC-7 (PST)'
  },
  {
    id: 'user_marcus',
    name: 'Marcus Vance',
    role: 'Sprint Lead & Architect',
    avatar: '/src/assets/images/avatar_marcus_vance_1790263309703.jpg',
    activeTasksCount: 5,
    timezone: 'UTC-4 (EDT)'
  },
  {
    id: 'user_elena',
    name: 'Elena Rostova',
    role: 'Design Systems Engineer',
    avatar: '/src/assets/images/avatar_alex_chen_1790263298476.jpg',
    activeTasksCount: 3,
    timezone: 'UTC+1 (CET)'
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'TSK-101',
    title: 'Finalize Mobile Design Tokens & Viewport Scales',
    description: 'Harmonize fluid spacing units and dynamic font scale constraints across iOS and Android break points.',
    status: 'in_progress',
    priority: 'high',
    assignee: {
      name: 'Alex Chen',
      role: 'Principal Product Designer',
      avatar: '/src/assets/images/avatar_alex_chen_1790263298476.jpg'
    },
    dueDate: '2026-09-28',
    tags: ['Design System', 'Mobile', 'Tokens'],
    points: 5,
    subtasks: [
      { id: 'st-1', title: 'Audit 320px–428px viewport boundaries', completed: true },
      { id: 'st-2', title: 'Export Tailwind v4 variable mapping', completed: true },
      { id: 'st-3', title: 'Validate WCAG AA contrast on dark OLED screens', completed: false }
    ],
    comments: [
      {
        id: 'c-1',
        author: 'Marcus Vance',
        avatar: '/src/assets/images/avatar_marcus_vance_1790263309703.jpg',
        text: 'The fluid scaling curve looks crisp on test device builds. Let us review in tomorrow morning standup.',
        createdAt: '2026-09-24 07:15'
      }
    ],
    createdAt: '2026-09-22'
  },
  {
    id: 'TSK-102',
    title: 'Refactor Canvas Rendering with Direct Matrix Transform',
    description: 'Ensure smooth 60fps pan and zoom on infinite graph with hardware acceleration and compositor isolation.',
    status: 'in_progress',
    priority: 'urgent',
    assignee: {
      name: 'Marcus Vance',
      role: 'Sprint Lead & Architect',
      avatar: '/src/assets/images/avatar_marcus_vance_1790263309703.jpg'
    },
    dueDate: '2026-09-26',
    tags: ['Architecture', 'Canvas', 'Performance'],
    points: 8,
    subtasks: [
      { id: 'st-4', title: 'Replace absolute positioning with CSS translate3d', completed: true },
      { id: 'st-5', title: 'Implement dynamic cubic-bezier connection curves', completed: true },
      { id: 'st-6', title: 'Benchmark drag latency under 120 node load', completed: false }
    ],
    comments: [],
    createdAt: '2026-09-21'
  },
  {
    id: 'TSK-103',
    title: 'Brand Identity Editorial Style Guide Documentation',
    description: 'Establish rules for unboxed typographic metadata, editorial numbering, and muted accent budget.',
    status: 'completed',
    priority: 'medium',
    assignee: {
      name: 'Alex Chen',
      role: 'Principal Product Designer',
      avatar: '/src/assets/images/avatar_alex_chen_1790263298476.jpg'
    },
    dueDate: '2026-09-23',
    tags: ['Brand', 'Docs', 'Guidelines'],
    points: 3,
    subtasks: [
      { id: 'st-7', title: 'Standardize 60-30-10 color ratio guidelines', completed: true },
      { id: 'st-8', title: 'Review editorial font pairing specimens', completed: true }
    ],
    comments: [
      {
        id: 'c-2',
        author: 'Elena Rostova',
        avatar: '/src/assets/images/avatar_alex_chen_1790263298476.jpg',
        text: 'Published to the specs directory. Everyone please inspect before next sprint planning.',
        createdAt: '2026-09-23 16:40'
      }
    ],
    createdAt: '2026-09-19'
  },
  {
    id: 'TSK-104',
    title: 'Offline State Cache & Local Synchronization Engine',
    description: 'Persist active canvas nodes, timer logs, and doc drafts to local storage with conflict-free merging.',
    status: 'in_review',
    priority: 'high',
    assignee: {
      name: 'Marcus Vance',
      role: 'Sprint Lead & Architect',
      avatar: '/src/assets/images/avatar_marcus_vance_1790263309703.jpg'
    },
    dueDate: '2026-09-27',
    tags: ['Core', 'Storage', 'PWA'],
    points: 5,
    subtasks: [
      { id: 'st-9', title: 'Draft schema migration serializer', completed: true },
      { id: 'st-10', title: 'Add debounce throttle to live markdown writes', completed: true }
    ],
    comments: [],
    createdAt: '2026-09-22'
  },
  {
    id: 'TSK-105',
    title: 'Interactive Focus Timer with Synthetic Web Audio Bell',
    description: 'Build zero-dependency audio synthesis for pomodoro intervals with visual breathing pulse.',
    status: 'completed',
    priority: 'low',
    assignee: {
      name: 'Marcus Vance',
      role: 'Sprint Lead & Architect',
      avatar: '/src/assets/images/avatar_marcus_vance_1790263309703.jpg'
    },
    dueDate: '2026-09-24',
    tags: ['Workbench', 'Audio', 'UX'],
    points: 2,
    subtasks: [
      { id: 'st-11', title: 'Calibrate C5-E5-G5 sine wave frequency decay', completed: true },
      { id: 'st-12', title: 'Hook into sprint session metrics', completed: true }
    ],
    comments: [],
    createdAt: '2026-09-23'
  },
  {
    id: 'TSK-106',
    title: 'Asset Board Lightbox & High-Res Inspection Modal',
    description: 'Provide pan-and-zoom inspection for mobile mockups and brand stationery asset sheets.',
    status: 'backlog',
    priority: 'medium',
    assignee: {
      name: 'Elena Rostova',
      role: 'Design Systems Engineer',
      avatar: '/src/assets/images/avatar_alex_chen_1790263298476.jpg'
    },
    dueDate: '2026-10-02',
    tags: ['Assets', 'UI', 'Modal'],
    points: 3,
    subtasks: [
      { id: 'st-13', title: 'Support keyboard ESC and arrow shortcuts', completed: false },
      { id: 'st-14', title: 'Show full color palette extraction', completed: false }
    ],
    comments: [],
    createdAt: '2026-09-24'
  },
  {
    id: 'TSK-107',
    title: 'Sprint Velocity Burndown Chart Data Normalization',
    description: 'Ensure accurate story point roll-ups across completed tasks and recalculate weekly sprint estimates.',
    status: 'backlog',
    priority: 'high',
    assignee: {
      name: 'Marcus Vance',
      role: 'Sprint Lead & Architect',
      avatar: '/src/assets/images/avatar_marcus_vance_1790263309703.jpg'
    },
    dueDate: '2026-10-01',
    tags: ['Metrics', 'Sprint', 'Charts'],
    points: 5,
    subtasks: [
      { id: 'st-15', title: 'Implement SVG path smoothing algorithm', completed: false }
    ],
    comments: [],
    createdAt: '2026-09-24'
  }
];

export const INITIAL_CANVAS_NODES: CanvasNode[] = [
  {
    id: 'node-1',
    type: 'card',
    title: 'Mobile App Architecture',
    description: 'Fluid layout and gesture navigation for financial dashboard screens.',
    x: 120,
    y: 120,
    width: 290,
    height: 180,
    color: '#0f172a',
    tags: ['Design', 'Mobile'],
    status: 'Active'
  },
  {
    id: 'node-2',
    type: 'asset',
    title: 'Mobile UI Master Asset',
    description: 'High-res mockup of production interface.',
    image: '/src/assets/images/asset_mobile_app_design_1790263260227.jpg',
    x: 480,
    y: 80,
    width: 320,
    height: 250,
    color: '#18181b',
    tags: ['Specimen']
  },
  {
    id: 'node-3',
    type: 'decision',
    title: 'Viewport Scaling Engine',
    description: 'Clamp font scales between 14px minimum and 28px display limit.',
    x: 480,
    y: 380,
    width: 280,
    height: 140,
    color: '#1e1b4b',
    tags: ['Logic']
  },
  {
    id: 'node-4',
    type: 'asset',
    title: 'Brand Guidelines Specimen',
    description: 'Color ratio matrix & typography rules.',
    image: '/src/assets/images/asset_brand_guidelines_1790263275669.jpg',
    x: 880,
    y: 140,
    width: 320,
    height: 250,
    color: '#18181b',
    tags: ['Brand']
  },
  {
    id: 'node-5',
    type: 'sticky',
    title: 'Standup Observation',
    description: 'Check dark mode optical compensation: font-weight 400 needs tracking +0.01em on pure obsidian.',
    x: 160,
    y: 360,
    width: 240,
    height: 160,
    color: '#312e81',
    tags: ['Review']
  }
];

export const INITIAL_CANVAS_CONNECTIONS: CanvasConnection[] = [
  { id: 'conn-1', fromId: 'node-1', toId: 'node-2', label: 'Renders Spec' },
  { id: 'conn-2', fromId: 'node-1', toId: 'node-3', label: 'Constraints' },
  { id: 'conn-3', fromId: 'node-2', toId: 'node-4', label: 'Adheres to' }
];

export const INITIAL_DOCS: WorkspaceDoc[] = [
  {
    id: 'doc-1',
    title: 'Sprint 14 Launch & Readiness Spec',
    category: 'Sprint',
    lastEdited: '2026-09-24 08:12',
    author: 'Marcus Vance',
    content: `# Sprint 14 Launch & Readiness Spec

## Executive Summary
This document outlines the acceptance criteria and deployment checkpoints for Sprint 14. All engineering subtasks and visual assets are linked directly to our workspace board.

### Key Milestones
- [x] Zero-latency infinite canvas dragging benchmarked at 60fps
- [x] Color system calibrated to strict 60-30-10 distribution
- [ ] Finalize fluid typography curve for high-DPI displays
- [ ] End-to-end local persistence validation

## Architectural Invariants
1. **Single-Elevation Depth**: Flat obsidian surfaces with 1px border lines (\`border-neutral-800\`). No stacked card-in-card containers.
2. **Zero-Pill Metadata**: Labels and timestamps must use clean, unboxed text separated by subtle bullets (\`·\`).
3. **Tabular Numerals**: All story points, timestamps, and metric values must enforce tabular figures (\`tabular-nums\`).

## Immediate Next Steps
Review the Asset Board moodboards and confirm the token mappings before code freeze on Friday.`
  },
  {
    id: 'doc-2',
    title: 'Design System RFC — Fluid Tokens',
    category: 'RFC',
    lastEdited: '2026-09-23 18:30',
    author: 'Alex Chen',
    content: `# Design System RFC: Fluid Layout & Spacing Tokens

## Problem Statement
Standard breakpoint jumps at 640px, 768px, and 1024px create awkward layout shifts when users resize windows in multi-monitor setups.

## Proposed Resolution
We define a mathematical interpolation between a baseline 360px mobile viewport and a 1440px desktop baseline:

\`\`\`css
--space-md: clamp(1rem, 0.75rem + 0.8vw, 1.75rem);
--type-display: clamp(1.5rem, 1.1rem + 1.6vw, 2.75rem);
\`\`\`

### Guidelines
- Keep typography scales readable without sudden layout jumps.
- Maintain high contrast on dark backgrounds with subtle optical letter-spacing.
- Always provide accessible touch targets (\`>= 40px\`).`
  },
  {
    id: 'doc-3',
    title: 'Architecture Spec: Canvas Graph Model',
    category: 'Specs',
    lastEdited: '2026-09-22 14:15',
    author: 'Marcus Vance',
    content: `# Architecture Spec: 2D Spatial Canvas

The interactive whiteboard utilizes a virtual coordinate plane:
- \`worldX = (screenX - pan.x) / zoom\`
- \`worldY = (screenY - pan.y) / zoom\`

Dynamic bezier curve connections compute cubic anchors based on source and target center points, rendering hardware-accelerated SVG paths.`
  }
];

export const INITIAL_ASSETS: CreativeAsset[] = [
  {
    id: 'ast-1',
    title: 'Mobile App Interface Mockup',
    category: 'UI Mockup',
    image: '/src/assets/images/asset_mobile_app_design_1790263260227.jpg',
    dimensions: '1920 × 1440',
    author: 'Alex Chen',
    updatedAt: '2026-09-24',
    description: 'Clean modern UI design presentation of a sleek mobile app interface displayed on high-end device screens, minimalist neutral studio background, soft studio lighting.',
    tags: ['Mobile', 'iOS', 'UI Spec']
  },
  {
    id: 'ast-2',
    title: 'Brand Identity Editorial Board',
    category: 'Brand',
    image: '/src/assets/images/asset_brand_guidelines_1790263275669.jpg',
    dimensions: '1920 × 1440',
    author: 'Alex Chen',
    updatedAt: '2026-09-23',
    description: 'Minimalist brand identity showcase presentation, editorial stationery specimens, typography layouts and warm muted color swatches on a clean architectural stone desk.',
    tags: ['Brand', 'Typography', 'Color Swatches']
  },
  {
    id: 'ast-3',
    title: 'Design System Token Architecture',
    category: 'System',
    image: '/src/assets/images/asset_design_system_1790263286459.jpg',
    dimensions: '1920 × 1440',
    author: 'Elena Rostova',
    updatedAt: '2026-09-23',
    description: 'Design system component library presentation board, sleek wireframes, button states and layout cards neatly arranged on an off-white architectural background.',
    tags: ['Tokens', 'Components', 'Wireframes']
  }
];
