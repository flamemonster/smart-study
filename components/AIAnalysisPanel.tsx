
import React, { useRef, useEffect } from 'react';
import { Note, QuizItem, ChatMessage } from '../types';
import { analyzeNoteContent, evaluateQuizAnswers, queryNote } from '../services/geminiService';
import { Sparkles, Loader2, BookOpen, HelpCircle, CheckCircle2, XCircle, Send, Check, X, MessageSquare, GraduationCap, Code, Image as ImageIcon, Copy } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AIAnalysisPanelProps {
  note: Note;
  onUpdateNote: (note: Note) => void;
}

type Tab = 'study' | 'chat';

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({ note, onUpdateNote }) => {
  const [activeTab, setActiveTab] = React.useState<Tab>('study');
  
  // Study State
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Chat State
  const [chatInput, setChatInput] = React.useState('');
  const [isChatting, setIsChatting] = React.useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [note.chatHistory, activeTab]);

  const handleAnalyze = async () => {
    if (!note.content.trim()) {
      setError("Please add some content to the note first.");
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    try {
      const analysisData = await analyzeNoteContent(note.content);
      
      // Convert simple string questions to rich QuizItems
      const quizItems: QuizItem[] = analysisData.questions.map(q => ({
        id: uuidv4(),
        question: q,
        userAnswer: '',
      }));

      onUpdateNote({
        ...note,
        analysis: {
          summary: analysisData.summary,
          questions: quizItems
        },
        updatedAt: Date.now()
      });
    } catch (err) {
      setError("Failed to generate analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    if (!note.analysis) return;
    
    const updatedQuestions = note.analysis.questions.map(q => 
      q.id === questionId ? { ...q, userAnswer: answer, isCorrect: undefined, feedback: undefined } : q
    );

    onUpdateNote({
      ...note,
      analysis: {
        ...note.analysis,
        questions: updatedQuestions
      }
    });
  };

  const handleCheckAnswers = async () => {
    if (!note.analysis || !note.analysis.questions.length) return;

    // Filter only items that have answers
    const itemsToGrade = note.analysis.questions.filter(q => q.userAnswer.trim() !== '');

    if (itemsToGrade.length === 0) {
      setError("Please answer at least one question before checking.");
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      // IMPORTANT: We pass the SUMMARY as the reference content.
      const referenceContent = note.analysis.summary.join('\n');
      
      const results = await evaluateQuizAnswers(referenceContent, itemsToGrade);
      
      const updatedQuestions = note.analysis.questions.map(q => {
        const evaluation = results.evaluations.find(e => e.questionId === q.id);
        if (evaluation) {
          return { ...q, isCorrect: evaluation.isCorrect, feedback: evaluation.feedback };
        }
        return q;
      });

      onUpdateNote({
        ...note,
        analysis: {
          ...note.analysis,
          questions: updatedQuestions
        }
      });
    } catch (err) {
      setError("Failed to check answers. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !note.content) return;
    
    const newUserMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: chatInput,
      timestamp: Date.now()
    };

    // Optimistic update
    const currentHistory = note.chatHistory || [];
    const updatedHistory = [...currentHistory, newUserMsg];
    
    onUpdateNote({
      ...note,
      chatHistory: updatedHistory
    });
    setChatInput('');
    setIsChatting(true);

    try {
      const responseData = await queryNote(note.content, updatedHistory, newUserMsg.content);
      
      const newAiMsg: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        content: responseData.text,
        attachment: responseData.attachment,
        timestamp: Date.now()
      };

      onUpdateNote({
        ...note,
        chatHistory: [...updatedHistory, newAiMsg]
      });
    } catch (err) {
      // Add error message to chat
      const errorMsg: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        content: "Sorry, I encountered an error while analyzing your note. Please try again.",
        timestamp: Date.now()
      };
      onUpdateNote({
        ...note,
        chatHistory: [...updatedHistory, errorMsg]
      });
    } finally {
      setIsChatting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper to render bold text from "**text**" format
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-purple-300 font-bold">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="w-full lg:w-[500px] border-l border-gray-800 bg-gray-900 flex flex-col h-full overflow-hidden transition-all duration-300">
      
      {/* Header Tabs */}
      <div className="bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-800">
        <div className="flex">
          <button
            onClick={() => setActiveTab('study')}
            className={`flex-1 p-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${
              activeTab === 'study' 
                ? 'text-purple-400 border-purple-400 bg-gray-800/50' 
                : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800/30'
            }`}
          >
            <GraduationCap size={16} />
            Study Guide
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 p-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${
              activeTab === 'chat' 
                ? 'text-blue-400 border-blue-400 bg-gray-800/50' 
                : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800/30'
            }`}
          >
            <MessageSquare size={16} />
            Ask Tutor
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* --- STUDY TAB --- */}
        {activeTab === 'study' && (
          <div className="h-full overflow-y-auto p-6 space-y-8">
            {!note.analysis && !isAnalyzing && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-4 pt-12">
                <BookOpen size={48} className="opacity-20" />
                <p className="text-sm px-4">
                  Generate a summary and study questions to help you master this topic.
                </p>
                <button
                  onClick={handleAnalyze}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-purple-900/20"
                >
                  Analyze Note
                </button>
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
              </div>
            )}

            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center h-full text-purple-400">
                <Loader2 size={32} className="animate-spin mb-3" />
                <p className="text-sm animate-pulse">Consulting Gemini...</p>
              </div>
            )}

            {note.analysis && !isAnalyzing && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-6">
                {/* Summary Section */}
                <div className="bg-gray-800/30 p-5 rounded-xl border border-gray-800">
                  <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BookOpen size={14} /> Smart Summary
                  </h3>
                  <ul className="space-y-4">
                    {note.analysis.summary.map((point, index) => (
                      <li key={index} className="text-sm text-gray-300 flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></span>
                        <span className="leading-relaxed opacity-90">
                           {renderFormattedText(point)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Questions Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                      <HelpCircle size={14} /> Knowledge Check
                    </h3>
                  </div>
                  
                  <div className="space-y-6">
                    {note.analysis.questions.map((item, index) => {
                      const isGraded = item.isCorrect !== undefined;
                      const isCorrect = item.isCorrect === true;
                      
                      const containerClass = isGraded
                        ? (isCorrect ? "bg-green-900/10 border-green-500/30" : "bg-red-900/10 border-red-500/30")
                        : "bg-gray-800/50 border-gray-700";
                      
                      const numberBadgeClass = isGraded
                        ? (isCorrect ? "bg-green-500/20 text-green-400 border-green-500/50" : "bg-red-500/20 text-red-400 border-red-500/50")
                        : "bg-blue-900/50 text-blue-400 border-blue-800";

                      return (
                        <div key={item.id} className={`p-4 rounded-xl border space-y-3 transition-colors duration-300 ${containerClass}`}>
                          <div className="flex gap-3">
                            <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${numberBadgeClass}`}>
                              {isGraded ? (isCorrect ? <Check size={14} /> : <X size={14} />) : (index + 1)}
                            </span>
                            <p className="text-sm text-gray-100 font-medium leading-relaxed">
                              {item.question}
                            </p>
                          </div>

                          <div className="pl-9">
                            <textarea
                              value={item.userAnswer || ''}
                              onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                              placeholder="Type your answer here..."
                              rows={2}
                              className={`w-full bg-gray-900 text-sm text-gray-200 p-3 rounded-lg border focus:outline-none transition-all resize-none
                                ${isGraded
                                  ? (isCorrect ? 'border-green-500/40 focus:border-green-500' : 'border-red-500/40 focus:border-red-500')
                                  : 'border-gray-700 focus:border-blue-500'}`}
                            />
                            
                            {item.feedback && (
                              <div className={`mt-3 text-xs p-3 rounded-lg flex items-start gap-2 border animate-in fade-in slide-in-from-top-2 ${
                                item.isCorrect 
                                  ? 'bg-green-900/20 border-green-900/50 text-green-300' 
                                  : 'bg-red-900/20 border-red-900/50 text-red-300'
                              }`}>
                                {item.isCorrect ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <XCircle size={14} className="mt-0.5 shrink-0" />}
                                <p>{item.feedback}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                     {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                     <button
                      onClick={handleCheckAnswers}
                      disabled={isChecking}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isChecking ? (<><Loader2 size={18} className="animate-spin" /> Checking Answers...</>) : (<><Send size={18} /> Check Answers</>)}
                    </button>
                    <button
                      onClick={handleAnalyze}
                      className="w-full py-2 text-xs font-medium text-gray-500 hover:text-purple-400 transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles size={12} /> Regenerate Questions
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- CHAT TAB --- */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-900/50">
              {(!note.chatHistory || note.chatHistory.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 opacity-60">
                   <div className="bg-gray-800 p-4 rounded-full mb-4">
                     <MessageSquare size={24} />
                   </div>
                   <p className="text-sm max-w-[200px]">Ask me anything about your notes!</p>
                   <p className="text-xs mt-2">"Can you explain the second point?"</p>
                </div>
              ) : (
                note.chatHistory.map((msg) => (
                  <div key={msg.id} className="flex flex-col gap-2">
                    {/* Chat Bubble */}
                    <div 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'
                        }`}
                      >
                        {msg.role === 'model' && (
                          <div className="text-xs text-blue-400 font-bold mb-1 flex items-center gap-1">
                            <Sparkles size={10} /> Alex (Tutor)
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>

                    {/* Attachment Card (Separate from bubble) */}
                    {msg.attachment && (
                      <div className="ml-4 mr-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-gray-950 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
                          {/* Attachment Header */}
                          <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                              {msg.attachment.type === 'code' ? <Code size={14} /> : <ImageIcon size={14} />}
                              <span>{msg.attachment.title || 'Example'}</span>
                            </div>
                            {msg.attachment.type === 'code' && (
                                <button 
                                  onClick={() => navigator.clipboard.writeText(msg.attachment!.content)}
                                  className="text-gray-500 hover:text-white transition-colors"
                                  title="Copy Code"
                                >
                                  <Copy size={12} />
                                </button>
                            )}
                          </div>
                          
                          {/* Attachment Content */}
                          <div className="p-0 overflow-x-auto">
                            {msg.attachment.type === 'code' ? (
                              <pre className="p-4 text-xs font-mono text-gray-300 leading-normal">
                                <code>{msg.attachment.content}</code>
                              </pre>
                            ) : (
                              <div className="p-4 flex items-center justify-center bg-white/5 min-h-[200px]">
                                {/* SVG Rendering */}
                                <div 
                                  dangerouslySetInnerHTML={{ __html: msg.attachment.content }} 
                                  className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-none px-4 py-3">
                    <Loader2 size={16} className="animate-spin text-gray-400" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-gray-900 border-t border-gray-800">
               <div className="relative">
                 <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Alex a question..."
                    className="w-full bg-gray-950 text-gray-200 pl-4 pr-12 py-3 rounded-xl border border-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-sm"
                    rows={1}
                    style={{ minHeight: '46px', maxHeight: '120px' }}
                 />
                 <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isChatting}
                    className="absolute right-2 top-2 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:bg-gray-700"
                 >
                   <Send size={16} />
                 </button>
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
