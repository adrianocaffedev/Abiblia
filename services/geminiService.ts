
import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Verse } from '../types';

// Garante acesso seguro ao process.env mesmo no navegador
const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  // Fallback seguro para evitar crash, mas retornará erro na chamada
  return '';
};

const getAI = () => {
    const key = getApiKey();
    if (!key) {
        console.error("API Key is missing in environment variables");
        return null;
    }
    return new GoogleGenAI({ apiKey: key });
};

// Função auxiliar robusta para extrair JSON vindo de LLMs
const cleanJsonResponse = (text: string) => {
  // Tenta encontrar um bloco de código JSON explícito
  const matchJson = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (matchJson) return matchJson[1].trim();

  // Tenta encontrar qualquer bloco de código
  const matchCode = text.match(/```\s*([\s\S]*?)\s*```/);
  if (matchCode) return matchCode[1].trim();

  // Se não encontrar blocos, limpa espaços e tenta usar o texto puro
  return text.trim();
};

export const fetchChapterContent = async (bookName: string, chapterNumber: number, retryCount = 0): Promise<{ verses: Verse[], summary: string }> => {
  const ai = getAI();
  if (!ai) throw new Error("Chave de API não configurada. Verifique suas variáveis de ambiente.");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Livro: ${bookName}, Capítulo: ${chapterNumber}.
      
      Tarefa: Forneça o texto bíblico completo em Português (versão Almeida).
      Retorne APENAS um JSON válido com a seguinte estrutura, sem formatação markdown extra fora do JSON:
      
      {
        "verses": [
          {"number": 1, "text": "Texto do versículo 1..."},
          {"number": 2, "text": "Texto do versículo 2..."}
        ],
        "summary": "Resumo teológico breve do capítulo."
      }`,
      config: {
        temperature: 0.1,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      }
    });

    if (response.text) {
      try {
        const cleanedText = cleanJsonResponse(response.text);
        const data = JSON.parse(cleanedText);
        
        if (!data.verses || !Array.isArray(data.verses) || data.verses.length === 0) {
            throw new Error("Estrutura de versículos inválida ou vazia.");
        }
        
        return data;
      } catch (parseError) {
        console.error("Erro ao fazer parse do JSON:", parseError);
        if (retryCount < 2) {
             console.log(`Erro de parse. Retentando... (${retryCount + 1}/3)`);
             return fetchChapterContent(bookName, chapterNumber, retryCount + 1);
        }
        throw new Error("Recebemos os dados, mas houve um erro ao processá-los.");
      }
    }
    
    if (retryCount < 2) {
        console.warn(`Resposta vazia. Retentando... (${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchChapterContent(bookName, chapterNumber, retryCount + 1);
    }
    
    throw new Error("O modelo não retornou texto após múltiplas tentativas.");

  } catch (error: any) {
    console.error(`Erro detalhado ao buscar capítulo (Tentativa ${retryCount + 1}):`, error);
    
    if (retryCount < 3 && (error.message?.includes('500') || error.message?.includes('503') || error.message?.includes('Internal'))) {
        const delay = (retryCount + 1) * 1500;
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchChapterContent(bookName, chapterNumber, retryCount + 1);
    }

    if (error instanceof Error) {
        throw error;
    }
    throw new Error("Falha ao carregar o capítulo. O serviço pode estar instável.");
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

export const getVerseAudio = async (text: string, voiceName: string = 'Puck'): Promise<string> => {
  const ai = getAI();
  if (!ai) throw new Error("API Key missing");

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: {
        parts: [{ text: text }],
        },
        config: {
        responseModalities: [Modality.AUDIO], 
        speechConfig: {
            voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
            },
        },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Não foi possível gerar o áudio.");
    return base64Audio;
  } catch (error) {
      console.error("Erro TTS:", error);
      throw error;
  }
}
