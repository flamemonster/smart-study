
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse, QuizItem, EvaluationResponse, ChatMessage, ChatAttachment } from "../types";
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
        You are "Alex", an elite study tutor who specializes in the Feynman Technique.
        
        Input Text:
        "${noteContent}"

        Task 1: The Summary (The "Explain Like I'm 5" version)
        Break down the input text into a crystal-clear, engaging study guide.
        
        Rules for Summary:
        1. **Simplify**: Use plain English. Avoid jargon unless you define it immediately.
        2. **Analogies**: For every abstract concept, provide a concrete "Real World Analogy" (e.g., "Think of a cell membrane like a nightclub bouncer...").
        3. **Keywords**: Wrap key terms in double asterisks like **this** to highlight them.
        4. **Tone**: Enthusiastic, encouraging, and smart. Use an occasional emoji to keep it fresh.
        5. **Structure**: Return a list of strings. Each string should focus on ONE main idea.
        
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

/**
 * Chats with the note content.
 */
export const queryNote = async (
  noteContent: string, 
  history: ChatMessage[], 
  newMessage: string
): Promise<{ text: string, attachment?: ChatAttachment }> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      config: {
        systemInstruction: `
          You are "Alex", a super enthusiastic, empathetic, and friendly AI study buddy. 
          
          Your Personality:
          - You speak naturally, like a supportive peer or a cool tutor, not a robot.
          - You use emojis occasionally to keep things light (e.g., ✨, 🚀, 📚).
          - You are encouraging. If the user is confused, you reassure them.
          - You always base your answers on the provided notes first, but you can expand slightly to help understanding.

          Separation of Concerns:
          - If the user asks for a CODE EXAMPLE or a DIAGRAM (visual), do NOT put the code or SVG directly in your spoken text.
          - Instead, use the 'attachment' field in the JSON response.
          - For 'image' requests, generate a clean, valid SVG string in the attachment content.
          - For 'code' requests, put the raw code in the attachment content.
          - Your spoken 'text' should be a brief, friendly introduction to the attachment (e.g., "Here's a diagram that explains that process! 👇").
          
          CONTEXT (The User's Notes):
          """${noteContent}"""
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: "The conversational response to the user."
            },
            attachment: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['code', 'image'] },
                title: { type: Type.STRING },
                content: { type: Type.STRING, description: "The raw code or SVG string." },
                language: { type: Type.STRING, description: "Programming language for code, or 'svg' for images." }
              },
              nullable: true
            }
          },
          required: ["text"]
        }
      },
      contents: [
        ...history.map(h => ({
          role: h.role,
          parts: [{ text: h.content }] // We only send the text history to keep context simple
        })),
        {
          role: 'user',
          parts: [{ text: newMessage }]
        }
      ]
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from AI");
    
    const parsed = JSON.parse(resultText);
    return {
      text: parsed.text,
      attachment: parsed.attachment
    };

  } catch (error) {
    console.error("Chat Error:", error);
    // Fallback for error
    return { text: "Oof! I tripped over a wire and couldn't process that. Mind asking again? 😅" };
  }
}
