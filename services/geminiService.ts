
import { GoogleGenAI, Type } from "@google/genai";
import { BloodType, Donor, BloodRequest } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CACHE_PREFIX = 'hs_insights_v1:';
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function makeCacheKey(payload: any) {
  try {
    const s = JSON.stringify(payload);
    return CACHE_PREFIX + btoa(unescape(encodeURIComponent(s)));
  } catch (e) {
    return CACHE_PREFIX + String(Date.now());
  }
}

function localInventoryAnalysis(inventory: any[]) {
  // Simple heuristic fallback: mark types with units <=5 as shortage risks
  const shortage: string[] = [];
  inventory.forEach((i) => {
    const units = Number(i.units || 0);
    if (Number.isNaN(units)) return;
    if (units <= 5) shortage.push(i.name || i.type);
  });
  const actionPlan = shortage.length
    ? `Targeted outreach and mobile drives for: ${shortage.join(', ')}.`
    : 'Stock levels appear stable; maintain regular collection.';
  return { shortageRisks: shortage, actionPlan };
}

export const getSmartDonorMatching = async (request: BloodRequest, availableDonors: Donor[]) => {
  const prompt = `
    Act as a medical logistics coordinator. I have a blood request and a list of donors.
    Request: ${JSON.stringify(request)}
    Donors: ${JSON.stringify(availableDonors)}
    
    Tasks:
    1. Identify the top 3 best matching donors based on Blood Type compatibility (e.g., O- can give to anyone), distance (lat/lng), and status.
    2. Provide a short reason why each donor was selected.
    3. Suggest a priority order for contacting them.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedDonors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  donorId: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  priority: { type: Type.INTEGER }
                },
                required: ["donorId", "reason", "priority"]
              }
            },
            generalAdvice: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Matchmaking Error:", error);
    return null;
  }
};

export const getInventoryInsights = async (inventory: any[]) => {
  const prompt = `Based on this blood inventory data: ${JSON.stringify(inventory)}, provide a smart, educational "Did You Know?" style insight about blood donation compatibility. 
  Explain the rules of blood donation (e.g., A+ can donate to A+ and AB+, O- is the universal donor, etc.) in a simple, engaging way for someone who doesn't know. 
  Relate it slightly to the current inventory if possible, but focus on the educational aspect.
  Provide a JSON object with 'insightTitle' (string, e.g., "The Universal Donor", "Who can A+ give to?"), 'educationalContent' (string, the explanation), and 'actionPlan' (string, a call to action).`;

  const cacheKey = makeCacheKey(inventory + "_educational");
  try {
    // return cached if fresh
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < CACHE_TTL_MS) {
          return parsed.value;
        }
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insightTitle: { type: Type.STRING },
            educationalContent: { type: Type.STRING },
            actionPlan: { type: Type.STRING }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text);
    // cache result
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), value: parsed }));
      } catch (e) {
        // ignore storage errors
      }
    }
    return parsed;
  } catch (error: any) {
    console.error("Inventory Insight Error:", error);
    // If quota/rate limit error, fall back to local heuristic
    try {
      const fallback = localInventoryAnalysis(inventory || []);
      return fallback;
    } catch (e) {
      return null;
    }
  }
};
