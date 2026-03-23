
import { GoogleGenAI } from "@google/genai";
import { Client, Disbursement, AgentPayment } from "../types";

export const generateSmartReport = async (clients: Client[], customPrompt?: string) => {
  if (!clients || clients.length === 0) {
    return "No client data available to analyze. Please add clients first.";
  }

  try {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Extract only necessary data for analysis to save tokens and improve privacy
    const clientSummary = clients.map(c => ({
      status: c.status,
      country: c.country,
      totalPaid: (c.payments || []).reduce((sum, p) => sum + p.amount, 0),
      ref: c.reference,
      installments: (c.payments || []).length,
      projectName: c.projectName
    }));

    const basePrompt = `You are a Senior Business Consultant for a recruitment and student consultancy firm. 
    Analyze the following database snapshot of ${clients.length} clients and provide a detailed strategic report:

    ${JSON.stringify(clientSummary)}
    
    The report must include:
    1. **Executive Summary**: A high-level overview of the current business state.
    2. **Pipeline Analysis**: How many clients are in each stage and where are the delays.
    3. **Revenue Insights**: Analysis of the payment trends and financial health.
    4. **Geographic Strengths**: Which countries are performing best.
    5. **Actionable Recommendations**: 3-5 specific steps to increase conversion and revenue.

    Format the output in clean, professional Markdown with headers and bullet points.`;

    const finalPrompt = customPrompt 
      ? `You are a Senior Business Consultant. Based on the following client data:
         ${JSON.stringify(clientSummary)}
         
         Please address the following specific request/prompt:
         "${customPrompt}"
         
         Format the output in clean, professional Markdown.`
      : basePrompt;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: finalPrompt,
      config: {
        systemInstruction: "You are a world-class business analyst specialized in consultancy services. Your tone is professional, encouraging, and data-driven.",
        temperature: 0.7,
      }
    });

    return response.text || "The AI was unable to generate a text response at this time.";
  } catch (error: any) {
    console.error("AI Report Generation Error:", error);
    return `### ⚠️ Analysis Failed\n\nThere was an error communicating with the AI service. Details: ${error.message || 'Unknown Error'}. Please ensure your API connection is active.`;
  }
};
