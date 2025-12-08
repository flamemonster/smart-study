import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse, QuizItem, EvaluationResponse } from "../types";
import { v4 as uuidv4 } from 'uuid';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Extracts text from an image using Gemini Multimodal capabilities.
 */
export const extractTextFromImage = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Extract all text from this image and format it as a clean text note. Do not add any introductory or concluding remarks, just the extracted text.",
          },
        ],
      },
    });
    return response.text || "";
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("Failed to extract text from image.");
  }
};

/**
 * Analyzes note content to generate a summary and study questions.
 */
export const analyzeNoteContent = async (noteContent: string): Promise<AnalysisResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `
        You are a passionate, engaging, and highly effective teacher. Your goal is to help your student truly understand the material, not just memorize it.

        Input Text:
        "${noteContent}"

        Your Instructions:

        Task 1: The Lesson (Summary)
        Write a summary of the input text. 
        - **Tone**: Warm, conversational, and enthusiastic (like a human tutor speaking).
        - **Structure**: Break it down into key concepts. 
        - **Requirement**: For every key point you make, you MUST provide a concrete, real-world **example** or analogy to help explain it.
        - **Format**: Return a list of strings, where each string is a complete thought/paragraph.

        Task 2: The Quiz (Questions)
        Create a comprehensive set of study questions.
        - **Constraint**: These questions must be answerable **SOLELY** based on the "Lesson" (Summary) you just wrote in Task 1. Do NOT ask about details from the Input Text that you excluded from the Summary.
        - **Exclusion Rule**: While your summary included examples/analogies to explain concepts, your questions should test the UNDERLYING CONCEPT, not the specific example itself. Do not mention the specific examples from the summary in the question text.
        - **Quantity**: Generate as many questions as necessary to fully test the student's understanding of your summary. There is no fixed limit.
        - **Style**: Open-ended questions that require thinking, not just keyword matching.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of engaging summary points, each containing an explanation and a concrete example.",
            },
            questions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A comprehensive list of questions based on the summary concepts, excluding specific example details.",
            },
          },
          required: ["summary", "questions"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text) as AnalysisResponse;
    return data;
  } catch (error) {
    console.error("Analysis Error:", error);
    throw new Error("Failed to analyze note.");
  }
};

/**
 * Checks user answers against the note content.
 */
export const evaluateQuizAnswers = async (
  referenceContent: string,
  quizItems: QuizItem[]
): Promise<EvaluationResponse> => {
  try {
    // Filter only items that have answers
    const itemsToCheck = quizItems.filter(q => q.userAnswer && q.userAnswer.trim() !== '');
    
    if (itemsToCheck.length === 0) return { evaluations: [] };

    const prompt = `
      You are a helpful and encouraging tutor grading a student's quiz.
      
      REFERENCE MATERIAL (The Lesson):
      "${referenceContent}"

      I will provide a list of questions and the student's answers.
      
      Your Goal:
      Determine if the student's answer is correct based **ONLY** on the REFERENCE MATERIAL provided above.
      
      Output Requirements:
      - isCorrect: true if the answer demonstrates understanding of the Reference Material.
      - feedback: A friendly, human-like 1-2 sentence explanation. 
        - If correct: Offer specific praise (e.g., "Spot on! You really grasped that concept.")
        - If incorrect: Kindly correct them using facts from the Reference Material (e.g., "Not quite. Remember, in our lesson we discussed that...").
    `;

    const itemsPayload = itemsToCheck.map(item => ({
      questionId: item.id,
      question: item.question,
      userAnswer: item.userAnswer
    }));

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `${prompt}\n\nStudent's Quiz Submission:\n${JSON.stringify(itemsPayload)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            evaluations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionId: { type: Type.STRING },
                  isCorrect: { type: Type.BOOLEAN },
                  feedback: { type: Type.STRING }
                },
                required: ["questionId", "isCorrect", "feedback"]
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No evaluation returned");
    
    return JSON.parse(text) as EvaluationResponse;
  } catch (error) {
    console.error("Evaluation Error:", error);
    throw new Error("Failed to evaluate answers.");
  }
};
