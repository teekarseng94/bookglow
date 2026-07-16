import { GoogleGenAI, Type } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Initialize using process.env.API_KEY directly as per guidelines
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async optimizeSchedule(businessType: string, challenges: string) {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this business: ${businessType}. Challenges: ${challenges}. Provide a scheduling strategy and 3 actionable tips in JSON format.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strategy: { type: Type.STRING, description: 'The overarching scheduling strategy' },
              tips: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: 'Three actionable tips'
              }
            },
            required: ['strategy', 'tips']
          }
        }
      });

      // Accessing response.text as a property, not a method, and trimming for JSON parsing
      const jsonStr = response.text?.trim();
      return jsonStr ? JSON.parse(jsonStr) : null;
    } catch (error) {
      console.error('Gemini Optimization Error:', error);
      return null;
    }
  }
}

export const geminiService = new GeminiService();