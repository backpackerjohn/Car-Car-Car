import { GoogleGenAI, Type } from "@google/genai";
import { CustomerProfile } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const customerProfileSchema = {
    type: Type.OBJECT,
    properties: {
        personal_info: {
            type: Type.OBJECT,
            properties: {
                full_name: { type: Type.STRING, description: "Customer's full name" },
                first_name: { type: Type.STRING, description: "Customer's first name, derived from full_name" },
                last_name: { type: Type.STRING, description: "Customer's last name, derived from full_name" },
                phone: { type: Type.STRING, description: "Customer's phone number" },
                email: { type: Type.STRING, description: "Customer's email address" },
                address: {
                    type: Type.OBJECT,
                    properties: {
                        full_address: { type: Type.STRING, description: "Customer's full street address, city, state, and zip" },
                        street: { type: Type.STRING, description: "Street address, derived from full_address" },
                        city: { type: Type.STRING, description: "City, derived from full_address" },
                        state: { type: Type.STRING, description: "State abbreviation, derived from full_address" },
                        zip: { type: Type.STRING, description: "ZIP code, derived from full_address" },
                    }
                },
            }
        },
        vehicle_info: {
            type: Type.OBJECT,
            properties: {
                interest_vehicle: {
                    type: Type.OBJECT,
                    description: "The vehicle the customer is interested in purchasing. Parse strings like '2023 Honda Civic' into year, make, and model.",
                    properties: {
                        year: { type: Type.STRING },
                        make: { type: Type.STRING },
                        model: { type: Type.STRING },
                        stock_number: { type: Type.STRING },
                        vin: { type: Type.STRING }
                    }
                },
                trade_vehicle: {
                    type: Type.OBJECT,
                    description: "The vehicle the customer wants to trade in. Parse strings like '2018 Toyota Camry' into year, make, and model.",
                    properties: {
                        year: { type: Type.STRING },
                        make: { type: Type.STRING },
                        model: { type: Type.STRING },
                        vin: { type: Type.STRING },
                    }
                },
                trade_in: { type: Type.BOOLEAN, description: "Set to true if they mention trading in a vehicle" },
                purchase_type: { type: Type.STRING, description: "Set to 'new' or 'used' if mentioned" }
            }
        },
        financial_info: {
            type: Type.OBJECT,
            properties: {
                financing_needed: { type: Type.BOOLEAN, description: "Set to true if they mention financing, loans, or credit applications" },
            }
        }
    }
};

/**
 * Extracts structured customer data from a natural language text message using the Gemini API.
 * @param {string} message The salesperson's text message.
 * @param {CustomerProfile} currentProfile The customer's current profile data to provide context.
 * @returns {Promise<Partial<CustomerProfile>>} A promise that resolves to a partial customer profile object with the extracted data.
 * @throws Will throw an error if the AI API call fails.
 */
export const extractDataFromText = async (message: string, currentProfile: CustomerProfile): Promise<Partial<CustomerProfile>> => {
    try {
        const systemInstruction = `You are an AI assistant for a car dealership. The current salesperson is ${currentProfile.sales_info.salesperson}. Your task is to extract structured information from a salesperson's chat message and create a JSON object to update the customer's profile.
        You will be given the salesperson's message and the customer's current JSON profile.
        - Analyze the message for any new customer data. A single message can contain multiple pieces of information (e.g., name, phone, and vehicle interest).
        - Create a JSON object containing ONLY the fields for which new information is provided.
        - NEVER overwrite existing data with empty or null values. If the message doesn't contain info for a field, omit that field from your JSON response.
        - **Data Transformation Rules:**
            - full_name: If a full name is given (e.g., "John Smith"), populate \`full_name\`, and also auto-split it into \`first_name\` and \`last_name\`.
            - full_address: If a full address is given, populate \`full_address\` and also auto-split it into \`street\`, \`city\`, \`state\`, and \`zip\`.
            - vehicle parsing: If a vehicle is mentioned (e.g., "2023 Honda Civic"), parse it into \`year\`, \`make\`, and \`model\`. Distinguish between an \`interest_vehicle\` (what they want to buy) and a \`trade_vehicle\` (what they are trading in).
        - **Inference Rules:**
            - trade_in: If the message mentions trading in a vehicle, set \`trade_in\` to \`true\` and populate the \`trade_vehicle\` object.
            - financing_needed: If the message mentions loans, credit, or payments, set \`financing_needed\` to \`true\`.
        - Respond ONLY with the JSON object of the data to be updated. If no new data is found, return an empty JSON object {}.`;

        const prompt = `
        **Salesperson Message:** "${message}"

        **Current Customer Profile:**
        ${JSON.stringify(currentProfile, null, 2)}
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: customerProfileSchema,
            }
        });

        const jsonText = response.text.trim();
        if (jsonText) {
            return JSON.parse(jsonText);
        }
        return {};
    } catch (error) {
        console.error("Error extracting data from text:", error);
        throw new Error("Failed to process message with AI.");
    }
};

/**
 * Extracts driver's license number and expiration date from an image using the Gemini Vision API.
 * @param {string} base64Image The base64-encoded image string.
 * @param {string} mimeType The MIME type of the image (e.g., 'image/jpeg').
 * @returns {Promise<Partial<Pick<CustomerProfile['personal_info']['drivers_license'], 'number' | 'expiration'>>>} A promise that resolves to an object with the license number and expiration date.
 * @throws Will throw an error if the AI API call fails.
 */
export const extractDataFromImage = async (base64Image: string, mimeType: string): Promise<Partial<Pick<CustomerProfile['personal_info']['drivers_license'], 'number' | 'expiration'>>> => {
    try {
        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType,
            },
        };

        const textPart = {
            text: `You are a highly accurate OCR system specialized in reading Ohio Driver's Licenses.
            From the provided image, extract the following fields precisely:
            1.  **License Number**: This is often labeled as "LN" or is a distinct alphanumeric string, typically 2 letters followed by 6 numbers.
            2.  **Expiration Date**: This is labeled "EXP". Extract it in MM-DD-YYYY format.
            
            If the image is blurry, unreadable, or not an Ohio Driver's License, return an empty JSON object.
            Respond ONLY with the extracted data in a JSON object.`
        };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        number: { type: Type.STRING, description: "The driver's license number." },
                        expiration: { type: Type.STRING, description: "The expiration date of the license (MM-DD-YYYY)." },
                    },
                    required: ["number", "expiration"]
                }
            }
        });

        const jsonText = response.text.trim();
        if (jsonText) {
            return JSON.parse(jsonText);
        }
        return {};

    } catch (error) {
        console.error("Error extracting data from image:", error);
        throw new Error("Failed to process driver's license image.");
    }
};
