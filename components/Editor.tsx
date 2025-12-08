
import React, { useRef } from 'react';
import { Note } from '../types';
import { Upload, Loader2, Image as ImageIcon, FileText, Type, Hash } from 'lucide-react';
import { extractTextFromImage } from '../services/geminiService';

interface EditorProps {
  note: Note;
  onUpdate: (updatedNote: Note) => void;
}

export const Editor: React.FC<EditorProps> = ({ note, onUpdate }) => {
  const [isProcessingImage, setIsProcessingImage] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate statistics
  const wordCount = note.content.trim() === '' 
    ? 0 
    : note.content.trim().split(/\s+/).length;
  const charCount = note.content.length;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...note, title: e.target.value, updatedAt: Date.now() });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...note, content: e.target.value, updatedAt: Date.now() });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }

    setIsProcessingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = base64String.split(',')[1];
        
        try {
          const extractedText = await extractTextFromImage(base64Data, file.type);
          
          // Append extracted text to current note content
          const newContent = note.content 
            ? `${note.content}\n\n--- Extracted from Image ---\n${extractedText}` 
            : extractedText;
            
          onUpdate({ ...note, content: newContent, updatedAt: Date.now() });
        } catch (err) {
          alert('Failed to extract text from image. Please try again.');
        } finally {
          setIsProcessingImage(false);
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File reading failed', error);
      setIsProcessingImage(false);
    }
  };

  const triggerFileUpload = () => {
    if (!isProcessingImage) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-950 relative">
      {/* Editor Toolbar / Header */}
      <div className="p-6 pb-2 z-10 bg-gray-950">
        <input
          type="text"
          value={note.title}
          onChange={handleTitleChange}
          placeholder="Note Title"
          className="w-full bg-transparent text-3xl font-bold text-white placeholder-gray-600 focus:outline-none mb-4"
        />
        <div className="flex items-center gap-4 border-b border-gray-800 pb-4">
          {/* Metadata Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-500 font-mono">
            <span title="Last Edited">
              {new Date(note.updatedAt).toLocaleString()}
            </span>
            <span className="hidden sm:inline text-gray-700">|</span>
            <span className="flex items-center gap-1" title="Word Count">
              <Type size={12} className="text-gray-600" />
              {wordCount} words
            </span>
            <span className="hidden sm:inline text-gray-700">|</span>
            <span className="flex items-center gap-1" title="Character Count">
              <Hash size={12} className="text-gray-600" />
              {charCount} chars
            </span>
          </div>

          <div className="flex-1"></div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
            accept="image/*"
          />
          <button
            onClick={triggerFileUpload}
            disabled={isProcessingImage}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessingImage ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <ImageIcon size={16} />
                <span>Import Image</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Text Area Container */}
      <div className="flex-1 relative overflow-hidden">
        
        {/* Empty State Call-to-Action */}
        {!note.content && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40">
            <div className="bg-gray-900/50 p-8 rounded-2xl border-2 border-dashed border-gray-800 flex flex-col items-center max-w-sm text-center">
              <div className="p-4 bg-gray-800 rounded-full mb-4">
                <ImageIcon size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">Start with an Image?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Upload a photo of your textbook or notes to extract text automatically.
              </p>
              <button 
                onClick={triggerFileUpload}
                className="pointer-events-auto px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Upload size={16} />
                Import Image
              </button>
            </div>
          </div>
        )}

        <textarea
          value={note.content}
          onChange={handleContentChange}
          placeholder={!note.content ? "Or just start typing your notes here..." : ""}
          className="absolute inset-0 w-full h-full bg-transparent text-gray-300 resize-none focus:outline-none leading-relaxed text-lg p-6 pt-2 placeholder-gray-700 z-0"
        />
      </div>
    </div>
  );
};
