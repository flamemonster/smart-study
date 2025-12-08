
export interface QuizItem {
  id: string;
  question: string;
  userAnswer: string;
  isCorrect?: boolean;
  feedback?: string;
}

export interface AIAnalysis {
  summary: string[];
  questions: QuizItem[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  analysis?: AIAnalysis;
}

export interface User {
  id: string;
  username: string;
  password: string; // Stored locally for demo purposes
}

// Raw response from Gemini before processing into app state
export interface AnalysisResponse {
  summary: string[];
  questions: string[];
}

export interface EvaluationResponse {
  evaluations: {
    questionId: string;
    isCorrect: boolean;
    feedback: string;
  }[];
}
