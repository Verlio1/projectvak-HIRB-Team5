import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIAnalysisResult, HouseStyle, HouseType } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      enum: ['LEAD', 'CUSTOMER', 'UNKNOWN'],
      description: "Determines if the input is about a property (LEAD) or a person/client (CUSTOMER).",
    },
    summary: {
      type: Type.STRING,
      description: "A very short summary of what was understood (e.g., 'Nieuwe klant Jan aangemaakt' or 'Huis in Leuven toegevoegd').",
    },
    // LEAD DATA
    lead: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        address: { type: Type.STRING },
        city: { type: Type.STRING },
        houseStyle: { 
          type: Type.STRING, 
          enum: ['Modern', 'Traditioneel', 'Cottage', 'Te Renoveren', 'Nieuwbouw', 'Onbekend'] 
        },
        houseType: { 
          type: Type.STRING, 
          enum: ['Vrijstaand', 'Halfopen', 'Rijhuis', 'Appartement', 'Villa', 'Onbekend'] 
        },
        estimatedPriceRange: { type: Type.STRING },
        ownerOrContact: { type: Type.STRING },
        notes: { type: Type.STRING },
        confidenceScore: { type: Type.INTEGER }
      },
      required: ["address", "houseStyle", "houseType", "notes"]
    },
    // CUSTOMER DATA
    customer: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        name: { type: Type.STRING, description: "Name of the person" },
        phone: { type: Type.STRING, description: "Phone number if mentioned, otherwise empty string" },
        email: { type: Type.STRING, description: "Email if mentioned, otherwise empty string" },
        status: { 
          type: Type.STRING, 
          enum: ['Zoekt woning', 'Verkoopt', 'Potentieel'],
          description: "Is the person buying, selling, or just a lead?" 
        },
        preference: { type: Type.STRING, description: "What are they looking for? (e.g. 'Villa in Leuven')" }
      },
      required: ["name", "status", "preference"]
    }
  },
  required: ["type", "summary"]
};

export const processAudioToData = async (audioBase64: string): Promise<AIAnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/wav",
              data: audioBase64
            }
          },
          {
            text: `
            Je bent een AI-assistent voor een makelaar. Analyseer de audio.
            
            Stap 1: Bepaal de intentie.
            - Gaat het over een HUIS/PAND dat de makelaar gezien heeft? -> Type = 'LEAD'
            - Gaat het over een PERSOON/KLANT die iets zoekt of verkoopt? -> Type = 'CUSTOMER'
            - Onduidelijk? -> Type = 'UNKNOWN'

            Stap 2: Extraheer de data op basis van het type.
            
            Voor LEADS (Huizen):
            - Adres, Stad, Stijl, Type, Prijsindicatie, Notities.
            
            Voor CUSTOMERS (Klanten):
            - Naam (bv. "Jan Janssens")
            - Telefoon/Email (indien genoemd)
            - Status: Zoekt woning (koper), Verkoopt (verkoper), of Potentieel.
            - Voorkeur: Wat zoeken ze? (bv. "Zoekt appartement in Gent rond 300k").

            Reageer ALTIJD in het Nederlands.
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2,
      }
    });

    if (!response.text) {
      throw new Error("No response from Gemini.");
    }

    const data = JSON.parse(response.text) as AIAnalysisResult;
    return data;

  } catch (error) {
    console.error("Error processing audio:", error);
    throw error;
  }
};