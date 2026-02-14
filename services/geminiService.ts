import { GoogleGenAI, Type } from "@google/genai";
import { TrackerType } from '../types';

export const generateTrackerSuggestions = async (prompt: string, type: TrackerType, userApiKey?: string, language: 'ru' | 'en' = 'ru'): Promise<string[]> => {
  // Use user provided key first, then fallback to env, then fail
  const apiKey = userApiKey || process.env.API_KEY || '';
  const isRu = language === 'ru';

  if (!apiKey) {
    console.warn("Gemini API Key is missing.");
    return [isRu ? "API ключ не найден. Укажите его в настройках." : "API Key missing. Please set it in settings."];
  }

  try {
    // Instantiate per request to allow changing key
    const ai = new GoogleGenAI({ apiKey });
    const model = ai.models;
    
    let systemInstruction = `You are a helpful assistant. Answer in ${isRu ? 'Russian' : 'English'}. `;
    
    // For NOTE type, we want paragraphs of text, but we'll ask for an array of strings (paragraphs) to keep the return type consistent
    if (type === TrackerType.NOTE) {
       systemInstruction += "Write a detailed note, recipe, or guide based on the user request. Return the content as a JSON array of strings, where each string is a paragraph or a section.";
    } else {
       systemInstruction += "Reply ONLY with a JSON array of strings (list items). ";
       switch (type) {
        case TrackerType.SHOPPING:
            systemInstruction += "Suggest a shopping list. List only item names.";
            break;
        case TrackerType.TRAVEL:
            systemInstruction += "Suggest a travel packing checklist.";
            break;
        case TrackerType.HABIT:
            systemInstruction += "Suggest good habits to track related to the request.";
            break;
        case TrackerType.TODO:
            systemInstruction += "Suggest subtasks for a goal/todo.";
            break;
        default:
            systemInstruction += "Suggest list items.";
        }
    }

    const response = await model.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    if (response.text) {
        const parsed = JSON.parse(response.text);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    }
    return [];

  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};