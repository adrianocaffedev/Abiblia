import { GoogleGenAI, Type } from "@google/genai";
import { Verse } from '../types';

const apiKey = process.env.API_KEY || '';
// Helper to avoid crashing if no key (will show error in UI)
const getAI = () => {
    if (!apiKey) {
        console.error("API Key is missing");
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

export const fetchChapterContent = async (bookName: string, chapterNumber: number): Promise<{ verses: Verse[], summary: string }> => {
  const ai = getAI();
  if (!ai) throw new Error("Chave de API não configurada.");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Livro: ${bookName}, Capítulo: ${chapterNumber}. Tradução: Almeida Corrigida Fiel (ACF) ou NVI.`,
      config: {
        systemInstruction: `Você é uma API que fornece textos bíblicos. 
        Sua tarefa é retornar o conteúdo exato do capítulo solicitado em formato JSON estrito.
        Não faça comentários, apenas retorne os dados.`,
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  text: { type: Type.STRING }
                },
                required: ["number", "text"]
              }
            },
            summary: {
              type: Type.STRING,
              description: "Um breve resumo do contexto teológico ou narrativo deste capítulo."
            }
          },
          required: ["verses", "summary"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data;
    }
    throw new Error("O modelo não retornou texto (conteúdo vazio).");

  } catch (error) {
    console.error("Erro ao buscar capítulo:", error);
    throw new Error("Falha ao carregar o capítulo. Tente novamente ou verifique a conexão.");
  }
};

export const askBibleAssistant = async (query: string, context: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Erro: API Key ausente.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        Contexto Atual (Capítulo sendo lido): ${context}
        
        Pergunta do Usuário: ${query}

        Instrução: Atue como um teólogo sábio, gentil e especialista bíblico. Responda à pergunta do usuário com base no contexto fornecido e no conhecimento geral bíblico. Use markdown para formatação. Seja conciso mas profundo.
      `
    });
    
    return response.text || "Desculpe, não consegui formular uma resposta.";
  } catch (error) {
    return "Erro ao consultar o assistente.";
  }
};

export const generateBibleCover = async (prompt: string): Promise<string> => {
  const ai = getAI();
  if (!ai) throw new Error("Chave de API não configurada.");

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '3:4',
        outputMimeType: 'image/jpeg',
      },
    });

    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (imageBytes) {
      return `data:image/jpeg;base64,${imageBytes}`;
    }
    throw new Error("Nenhuma imagem gerada.");
  } catch (error) {
    console.error("Erro ao gerar capa:", error);
    throw new Error("Falha ao gerar a capa.");
  }
};