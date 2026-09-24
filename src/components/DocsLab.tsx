import React, { useState } from 'react';
import { WorkspaceDoc } from '../types';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Clock,
  User,
  FolderOpen,
  Edit3,
  Eye,
  Check
} from 'lucide-react';

interface DocsLabProps {
  docs: WorkspaceDoc[];
  onUpdateDoc: (doc: WorkspaceDoc) => void;
  onAddDoc: (doc: WorkspaceDoc) => void;
  onDeleteDoc: (id: string) => void;
}

export const DocsLab: React.FC<DocsLabProps> = ({
  docs,
  onUpdateDoc,
  onAddDoc,
  onDeleteDoc
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(docs[0]?.id || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<'Specs' | 'RFC' | 'Sprint' | 'Notes'>('Specs');
  const [editContent, setEditContent] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const activeDoc = docs.find((d) => d.id === selectedDocId) || docs[0];

  const handleSelectDoc = (doc: WorkspaceDoc) => {
    setSelectedDocId(doc.id);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    if (!activeDoc) return;
    setEditTitle(activeDoc.title);
    setEditCategory(activeDoc.category);
    setEditContent(activeDoc.content);
    setIsEditing(true);
  };

  const handleSaveDoc = () => {
    if (!activeDoc) return;
    const updated: WorkspaceDoc = {
      ...activeDoc,
      title: editTitle.trim() || activeDoc.title,
      category: editCategory,
      content: editContent,
      lastEdited: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    onUpdateDoc(updated);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleCreateNewDoc = () => {
    const newDoc: WorkspaceDoc = {
      id: `doc-${Date.now()}`,
      title: 'Untitled Document Draft',
      category: 'Notes',
      lastEdited: new Date().toISOString().replace('T', ' ').slice(0, 16),
      author: 'Alex Chen',
      content: `# Untitled Document Draft\n\nWrite your specification, RFC, or sprint notes here...`
    };
    onAddDoc(newDoc);
    setSelectedDocId(newDoc.id);
    setEditTitle(newDoc.title);
    setEditCategory(newDoc.category);
    setEditContent(newDoc.content);
    setIsEditing(true);
  };

  // Calculate statistics
  const wordCount = (isEditing ? editContent : activeDoc?.content || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-neutral-950">
      {/* Sidebar: Documents list grouped by category */}
      <aside className="w-72 border-r border-neutral-800 bg-neutral-900/30 flex flex-col h-full">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Workspace Docs
            </h2>
          </div>
          <button
            onClick={handleCreateNewDoc}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
            title="Create New Doc"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {docs.map((doc) => {
            const isSelected = doc.id === activeDoc?.id;
            return (
              <button
                key={doc.id}
                onClick={() => handleSelectDoc(doc)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-neutral-900 border-neutral-700/80 text-white shadow-xs'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                    {doc.category}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {doc.lastEdited.slice(5, 10)}
                  </span>
                </div>
                <h4 className="text-xs font-medium truncate leading-tight">
                  {doc.title}
                </h4>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Document Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-950">
        {activeDoc ? (
          <>
            {/* Header action bar */}
            <div className="px-8 py-3.5 border-b border-neutral-800 bg-neutral-900/20 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  {activeDoc.author}
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  Last modified {activeDoc.lastEdited}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{wordCount} words</span>
              </div>

              <div className="flex items-center gap-2">
                {savedSuccess && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                    <Check className="w-3.5 h-3.5" />
                    Saved
                  </span>
                )}

                {isEditing ? (
                  <button
                    onClick={handleSaveDoc}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-md transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Doc</span>
                  </button>
                )}

                {docs.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this document?')) {
                        onDeleteDoc(activeDoc.id);
                        setSelectedDocId(docs.find((d) => d.id !== activeDoc.id)?.id || '');
                      }
                    }}
                    className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-900 rounded transition-colors"
                    title="Delete Document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Document Content View / Edit */}
            <div className="flex-1 overflow-y-auto p-8 max-w-4xl w-full mx-auto">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as any)}
                      className="px-3 py-1.5 text-xs font-mono bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Specs">Specs</option>
                      <option value="RFC">RFC</option>
                      <option value="Sprint">Sprint</option>
                      <option value="Notes">Notes</option>
                    </select>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Document title..."
                      className="flex-1 px-3 py-1.5 text-lg font-bold bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <textarea
                    rows={20}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-4 font-mono text-xs leading-relaxed bg-neutral-900/60 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-indigo-500 resize-y"
                    placeholder="Enter document text or markdown..."
                  />
                </div>
              ) : (
                <div className="prose prose-invert max-w-none">
                  <div className="mb-6 pb-4 border-b border-neutral-800">
                    <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">
                      {activeDoc.category}
                    </span>
                    <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
                      {activeDoc.title}
                    </h1>
                  </div>

                  {/* Render content paragraphs cleanly */}
                  <div className="space-y-4 text-neutral-300 text-sm leading-relaxed">
                    {activeDoc.content.split('\n\n').map((paragraph, idx) => {
                      if (paragraph.startsWith('# ')) {
                        return (
                          <h1 key={idx} className="text-xl font-bold text-white mt-6 mb-2">
                            {paragraph.replace('# ', '')}
                          </h1>
                        );
                      }
                      if (paragraph.startsWith('## ')) {
                        return (
                          <h2 key={idx} className="text-base font-semibold text-neutral-100 mt-5 mb-2">
                            {paragraph.replace('## ', '')}
                          </h2>
                        );
                      }
                      if (paragraph.startsWith('### ')) {
                        return (
                          <h3 key={idx} className="text-sm font-semibold text-neutral-200 mt-4 mb-1">
                            {paragraph.replace('### ', '')}
                          </h3>
                        );
                      }
                      if (paragraph.startsWith('```')) {
                        return (
                          <pre
                            key={idx}
                            className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-xs font-mono text-indigo-300 overflow-x-auto my-3"
                          >
                            {paragraph.replace(/```[a-z]*/g, '').trim()}
                          </pre>
                        );
                      }
                      if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                        return (
                          <ul key={idx} className="list-disc pl-5 space-y-1 text-xs">
                            {paragraph.split('\n').map((item, i) => (
                              <li key={i}>{item.replace(/^[-*]\s*/, '')}</li>
                            ))}
                          </ul>
                        );
                      }
                      return (
                        <p key={idx} className="text-xs text-neutral-300 leading-relaxed">
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <FileText className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-400">No document selected</p>
              <button
                onClick={handleCreateNewDoc}
                className="mt-3 px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-neutral-800 rounded-lg"
              >
                Create Document
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
