
import React from 'react';
import { Note, User } from '../types';
import { Plus, Trash2, Search, LogOut, User as UserIcon } from 'lucide-react';

interface SidebarProps {
  notes: Note[];
  selectedNoteId: string | null;
  user: User;
  onSelectNote: (id: string) => void;
  onAddNote: () => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  selectedNoteId,
  user,
  onSelectNote,
  onAddNote,
  onDeleteNote,
  onLogout,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full md:w-64 lg:w-72 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
             <span className="bg-blue-600 p-1 rounded-lg">📝</span> SmartNotes
          </h1>
          <button
            onClick={onAddNote}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            title="Create New Note"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 text-gray-200 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Note List */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm mt-8">
            {searchTerm ? 'No notes found.' : 'No notes yet.\nClick + to create one!'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {filteredNotes.map((note) => (
              <li
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={`group cursor-pointer p-4 transition-colors hover:bg-gray-800 ${
                  selectedNoteId === note.id ? 'bg-gray-800 border-l-4 border-blue-500' : 'border-l-4 border-transparent'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-semibold truncate ${selectedNoteId === note.id ? 'text-white' : 'text-gray-300'}`}>
                      {note.title || 'Untitled Note'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {note.content || 'No content...'}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => onDeleteNote(note.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-all"
                    title="Delete Note"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-400">
              <UserIcon size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate max-w-[100px]">{user.username}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
