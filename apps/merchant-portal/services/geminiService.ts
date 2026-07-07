
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

/**
 * Analyzes business transactions using Gemini to provide insights.
 */
export const getBusinessInsights = async (transactions: Transaction[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const summary = transactions.map(t => ({
    type: t.type,
    amount: t.amount,
    date: t.date,
    category: t.category,
    desc: t.description
  }));

  const prompt = `
    Analyze the following spa wellness center business data and provide 3-4 concise, actionable insights for growth or cost-cutting.
    
    Data Summary:
    ${JSON.stringify(summary)}

    Format your response as a simple list of bullet points. Be specific to the spa industry.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating insights. Please try again later.";
  }
};

/**
 * Generates a friendly, professional appointment reminder message.
 */
export const generateReminderMessage = async (
  clientName: string,
  serviceName: string,
  date: string,
  time: string,
  shopName: string,
  channel: 'Email' | 'SMS' | 'Both'
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Draft a friendly and professional ${channel} reminder message for a spa client.
    Client: ${clientName}
    Service: ${serviceName}
    Date: ${date}
    Time: ${time}
    Spa Name: ${shopName}

    Keep it concise and welcoming. If it's SMS, keep it under 160 characters. If it's email, include a nice subject line.
    Return only the drafted content.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Hello! Just a reminder of your upcoming spa appointment.";
  } catch (error) {
    console.error("Gemini Reminder Error:", error);
    return `Reminder for ${clientName}: Your ${serviceName} is scheduled for ${date} at ${time} at ${shopName}. We look forward to seeing you!`;
  }
};
