import { VertexAI, FunctionDeclaration, Schema, FunctionDeclarationSchemaType } from '@google-cloud/vertexai';
import { config } from '../config';
import { searchMilvus } from './vector';
import { getPollingStation } from './bhuvan';

const vertexAI = new VertexAI({ project: config.gcpProjectId, location: config.location });
const generativeModel = vertexAI.preview.getGenerativeModel({
  model: 'gemini-3.1-pro',
});

// Define tools (Function Calling)
const faqSearchDeclaration: FunctionDeclaration = {
  name: 'search_voting_faq',
  description: 'Searches the official Election Commission FAQ database for procedural questions about voting, eligibility, forms, and rules.',
  parameters: {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      query: { type: FunctionDeclarationSchemaType.STRING, description: 'The user\'s question regarding elections.' },
    },
    required: ['query'],
  },
};

const locatePollingStationDeclaration: FunctionDeclaration = {
  name: 'locate_polling_station',
  description: 'Finds the polling station location using Bhuvan Maps ISRO data based on user pincode or constituency.',
  parameters: {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      locationQuery: { type: FunctionDeclarationSchemaType.STRING, description: 'Pincode, locality, or constituency name.' },
    },
    required: ['locationQuery'],
  },
};

export async function processQuery(query: string, language: string, userId: string): Promise<string> {
  const chat = generativeModel.startChat({
    tools: [{ functionDeclarations: [faqSearchDeclaration, locatePollingStationDeclaration] }],
  });

  const prompt = `You are Jan-Mat AI, the official Election Commission of India assistant.
You provide accurate, neutral, and secure information.
The user's language preference is: ${language}.
Respond entirely in this language or use the Bhashini API for translation if necessary.
User query: ${query}`;

  const result = await chat.sendMessage(prompt);
  const response = result.response;

  // Handle function calling
  const functionCallPart = response.candidates?.[0]?.content?.parts?.find(p => p.functionCall);
  if (functionCallPart && functionCallPart.functionCall) {
    const call = functionCallPart.functionCall;
    
    let functionResponse: any;
    if (call.name === 'search_voting_faq') {
      const args = call.args as { query: string };
      // O(1) Vector Search
      functionResponse = await searchMilvus(args.query); 
    } else if (call.name === 'locate_polling_station') {
      const args = call.args as { locationQuery: string };
      functionResponse = await getPollingStation(args.locationQuery);
    }

    // Return the tool output to Gemini
    const secondResult = await chat.sendMessage([{
      functionResponse: {
        name: call.name,
        response: { content: functionResponse }
      }
    }]);
    
    return secondResult.response.candidates?.[0].content.parts[0].text || "I'm sorry, I couldn't process that.";
  }

  return response.candidates?.[0].content.parts[0].text || "I'm sorry, I couldn't process that.";
}
