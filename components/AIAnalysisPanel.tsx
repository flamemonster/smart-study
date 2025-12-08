import React from 'react';
import { Note, QuizItem } from '../types';
import { analyzeNoteContent, evaluateQuizAnswers } from '../services/geminiService';
import { Sparkles, Loader2, BookOpen, HelpCircle, CheckCircle2, XCircle, Send, Check, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AIAnalysisPanelProps {
  note: Note;
  onUpdateNote: (note: Note) => void;
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({ note, onUpdateNote }) => {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
      // IMPORTANT: We pass the SUMMARY as the reference content, not the original note content.
      // This ensures the AI grades based on the material it actually taught the student.
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

  return (
    // Widened width from w-80 to w-[500px] for better quiz experience
    <div className="w-full lg:w-[500px] border-l border-gray-800 bg-gray-900 flex flex-col h-full overflow-hidden transition-all duration-300">
      <div className="p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="text-purple-400" size={18} />
          AI Study Assistant
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {!note.analysis && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500 space-y-4">
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
          <div className="flex flex-col items-center justify-center h-64 text-purple-400">
            <Loader2 size={32} className="animate-spin mb-3" />
            <p className="text-sm animate-pulse">Consulting Gemini...</p>
          </div>
        )}

        {note.analysis && !isAnalyzing && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            {/* Summary Section */}
            <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-800">
              <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <BookOpen size={14} /> Summary
              </h3>
              <ul className="space-y-4">
                {note.analysis.summary.map((point, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0"></span>
                    <span className="leading-relaxed">{point}</span>
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
                  
                  // Dynamic styles based on correctness
                  const containerClass = isGraded
                    ? (isCorrect ? "bg-green-900/10 border-green-500/30" : "bg-red-900/10 border-red-500/30")
                    : "bg-gray-800/50 border-gray-700";
                  
                  const numberBadgeClass = isGraded
                    ? (isCorrect ? "bg-green-500/20 text-green-400 border-green-500/50" : "bg-red-500/20 text-red-400 border-red-500/50")
                    : "bg-blue-900/50 text-blue-400 border-blue-800";

                  return (
                    <div key={item.id} className={`p-4 rounded-xl border space-y-3 transition-colors duration-300 ${containerClass}`}>
                      {/* Question Header */}
                      <div className="flex gap-3">
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${numberBadgeClass}`}>
                          {isGraded ? (
                             isCorrect ? <Check size={14} /> : <X size={14} />
                          ) : (
                             index + 1
                          )}
                        </span>
                        <p className="text-sm text-gray-100 font-medium leading-relaxed">
                          {item.question}
                        </p>
                      </div>

                      {/* Answer Input */}
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
                        
                        {/* Feedback Display */}
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

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col gap-3 sticky bottom-0 bg-gray-900 py-4 border-t border-gray-800">
                 {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                 
                 <button
                  onClick={handleCheckAnswers}
                  disabled={isChecking}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isChecking ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Checking Answers...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Check Answers
                    </>
                  )}
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
    </div>
  );
};