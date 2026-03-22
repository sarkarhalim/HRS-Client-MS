
import { GoogleGenAI } from "@google/genai";
import { Client, Disbursement, AgentPayment } from "../types";

export const generateSmartReport = async (clients: Client[], customPrompt?: string) => {
  if (!clients || clients.length === 0) {
    return "No client data available to analyze. Please add clients first.";
  }

  // Initialize AI with the standard environment variable
  // API_KEY is used when a user selects a key, GEMINI_API_KEY is the default platform key
  let apiKey = '';
  if (typeof process !== 'undefined') {
    apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
  } else {
    apiKey = (window as any).process?.env?.API_KEY || (window as any).process?.env?.GEMINI_API_KEY || '';
  }
  
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

  try {
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

export const chatWithData = async (
  clients: Client[],
  disbursements: Disbursement[],
  agentPayments: AgentPayment[],
  chatHistory: { role: 'user' | 'model', parts: { text: string }[] }[],
  newMessage: string
) => {
  let apiKey = '';
  if (typeof process !== 'undefined') {
    apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
  } else {
    apiKey = (window as any).process?.env?.API_KEY || (window as any).process?.env?.GEMINI_API_KEY || '';
  }
  
  const ai = new GoogleGenAI({ apiKey: apiKey });

  // Prepare a condensed version of the data to avoid exceeding token limits
  const dataContext = {
    clients: clients.map(c => ({
      name: c.name,
      status: c.status,
      country: c.country,
      totalPaid: (c.payments || []).reduce((sum, p) => sum + p.amount, 0),
      projectName: c.projectName,
      contact: c.contact,
      createdAt: c.createdAt
    })),
    disbursements: disbursements.map(d => ({
      amount: d.amount,
      purpose: d.purpose,
      date: d.date
    })),
    agentPayments: agentPayments.map(a => ({
      agentName: a.agentName,
      amount: a.amount,
      date: a.date,
      purpose: a.purpose
    }))
  };

  const systemInstruction = `You are an AI assistant for a recruitment and student consultancy firm's management app.
You have access to the following current data snapshot:
${JSON.stringify(dataContext)}

Answer the user's questions accurately based ONLY on this data. Be concise, professional, and helpful. If asked for summaries or reports, provide them clearly using Markdown. If the data doesn't contain the answer, say so.`;

  try {
    const chat = ai.chats.create({
      model: "gemini-3.1-pro-preview",
      config: {
        systemInstruction,
        temperature: 0.2,
      }
    });

    // We need to send the history manually if we want context, but the SDK's chat.sendMessage 
    // maintains its own history. Since we are creating a new chat instance each time, 
    // we should ideally pass the history. Let's just use generateContent with history.
    
    const contents = [
      ...chatHistory.map(msg => ({
        role: msg.role,
        parts: msg.parts
      })),
      { role: 'user', parts: [{ text: newMessage }] }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: contents as any,
      config: {
        systemInstruction,
        temperature: 0.2,
      }
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    return `Error: ${error.message || 'Unknown Error'}`;
  }
};
