
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { AIAnalysisPanel } from './components/AIAnalysisPanel';
import { Auth } from './components/Auth';
import { Note, User } from './types';

const App: React.FC = () => {
  // --- State ---
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  // --- Effects ---

  // 1. Check for active session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('smart-study-current-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // 2. Load User's Notes when User changes
  useEffect(() => {
    if (user) {
      const savedNotes = localStorage.getItem(`smart-study-notes-${user.id}`);
      if (savedNotes) {
        try {
          const parsedNotes: Note[] = JSON.parse(savedNotes);
          
          // Migration logic (keeping legacy support just in case)
          const migratedNotes = parsedNotes.map(note => {
            if (note.analysis && note.analysis.questions && note.analysis.questions.length > 0) {
              if (typeof note.analysis.questions[0] === 'string') {
                const legacyQuestions = note.analysis.questions as unknown as string[];
                return {
                  ...note,
                  analysis: {
                    ...note.analysis,
                    questions: legacyQuestions.map((q) => ({
                      id: uuidv4(),
                      question: q,
                      userAnswer: ''
                    }))
                  }
                };
              }
            }
            return note;
          });
          
          setNotes(migratedNotes);
          // Select first note if available
          if (migratedNotes.length > 0) {
            setSelectedNoteId(migratedNotes[0].id);
          } else {
            setSelectedNoteId(null);
          }
        } catch (e) {
          console.error("Failed to parse notes", e);
          setNotes([]);
        }
      } else {
        setNotes([]);
        setSelectedNoteId(null);
      }
    } else {
      setNotes([]);
      setSelectedNoteId(null);
    }
  }, [user]);

  // 3. Persist Notes whenever they change (only if user logged in)
  useEffect(() => {
    if (user) {
      localStorage.setItem(`smart-study-notes-${user.id}`, JSON.stringify(notes));
    }
  }, [notes, user]);

  // --- Handlers ---

  const handleLogin = (loggedInUser: User) => {
    localStorage.setItem('smart-study-current-user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('smart-study-current-user');
    setUser(null);
  };

  const handleAddNote = () => {
    const newNote: Note = {
      id: uuidv4(),
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
  };

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes(notes.map(n => (n.id === updatedNote.id ? updatedNote : n)));
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this note?')) {
      const newNotes = notes.filter(n => n.id !== id);
      setNotes(newNotes);
      if (selectedNoteId === id) {
        setSelectedNoteId(newNotes.length > 0 ? newNotes[0].id : null);
      }
    }
  };

  // Derived state for the editor
  const selectedNote = notes.find(n => n.id === selectedNoteId);

  // --- Render ---

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-full bg-gray-950 text-gray-100 font-sans overflow-hidden">
      
      {/* Left Sidebar */}
      <Sidebar
        notes={notes}
        selectedNoteId={selectedNoteId}
        user={user}
        onSelectNote={setSelectedNoteId}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        {selectedNote ? (
          <>
            {/* Center Editor */}
            <div className="flex-1 h-full min-w-0">
               <Editor 
                 note={selectedNote} 
                 onUpdate={handleUpdateNote} 
               />
            </div>
            
            {/* Right AI Panel */}
            <div className="hidden md:block h-full shadow-xl z-10">
               <AIAnalysisPanel 
                 note={selectedNote}
                 onUpdateNote={handleUpdateNote}
               />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 text-center max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome, {user.username}!</h2>
              <p className="mb-6">Select a note from the sidebar or create a new one to get started.</p>
              <button
                onClick={handleAddNote}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-blue-900/20"
              >
                Create New Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
