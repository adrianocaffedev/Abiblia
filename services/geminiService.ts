
import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
import { Verse } from '../types';

// Função robusta para encontrar a API Key em diferentes ambientes
const getApiKey = (): string | undefined => {
  // 1. Padrão VITE (Mais comum atualmente em deploys modernos/Vercel)
  // O Vite só expõe variáveis que começam com VITE_ por padrão
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
       // @ts-ignore
       if (import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
       // @ts-ignore
       if (import.meta.env.REACT_APP_API_KEY) return import.meta.env.REACT_APP_API_KEY;
    }
  } catch (e) {
    // Ignora erros se import.meta não existir
  }

  // 2. Padrão Create React App / Webpack (process.env)
  // Tenta ler diretamente para garantir que o bundler faça a substituição da string
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
      if (process.env.VITE_API_KEY) return process.env.VITE_API_KEY;
      if (process.env.API_KEY) return process.env.API_KEY;
    }
  } catch (e) {
    // Ignora erros de acesso ao process
  }

  return undefined;
};

// Acesso à API Key
const getAI = () => {
    const key = getApiKey();
    if (key) {
        return new GoogleGenAI({ apiKey: key });
    }
    return null;
};

const CACHE_PREFIX = 'bible_content_v1_';

export const fetchChapterContent = async (bookName: string, chapterNumber: number, retryCount = 0): Promise<{ verses: Verse[], summary: string }> => {
  // 1. Tenta buscar do Cache Local Primeiro
  const cacheKey = `${CACHE_PREFIX}${bookName}_${chapterNumber}`;
  try {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        const parsed = JSON.parse(cachedData);
        // Validação simples para garantir que o cache não está corrompido
        if (parsed && Array.isArray(parsed.verses) && parsed.verses.length > 0) {
            console.log(`Carregado do cache: ${bookName} ${chapterNumber}`);
            return parsed;
        }
    }
  } catch (e) {
    console.warn("Erro ao ler cache", e);
    localStorage.removeItem(cacheKey);
  }

  // 2. Se não tem no cache, chama a AI
  const ai = getAI();
  if (!ai) throw new Error("MISSING_API_KEY");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Livro: ${bookName}, Capítulo: ${chapterNumber}.
      
      Tarefa: Forneça o texto bíblico completo em Português (versão Almeida).
      Forneça também um resumo teológico breve do capítulo.`,
      config: {
        temperature: 0.1,
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
            summary: { type: Type.STRING }
          },
          required: ["verses", "summary"]
        },
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
        const data = JSON.parse(response.text);
        
        if (!data.verses || !Array.isArray(data.verses) || data.verses.length === 0) {
            throw new Error("Estrutura de versículos inválida ou vazia.");
        }
        
        // Salva no Cache para a próxima vez
        try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (cacheError) {
            console.warn("Não foi possível salvar no cache (provavelmente quota excedida).");
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
  if (!ai) return "Por favor, configure sua API Key para usar o assistente. (Erro: Chave não detectada)";

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
