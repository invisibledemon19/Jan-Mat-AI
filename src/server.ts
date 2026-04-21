// Google Cloud Trace initialization must be the first import
import * as traceAgent from '@google-cloud/trace-agent';
traceAgent.start();

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { securityMiddleware } from './middleware/security';
import { processQuery } from './services/ai';
import { transcribeAudio, synthesizeSpeech } from './services/bhashini';

const server: FastifyInstance = Fastify({
  logger: true
});

// Register standard security plugins
server.register(helmet);
server.register(cors);

// Define request interface
interface ChatRequest {
  Body: {
    message?: string;
    audioUrl?: string;
    language: string;
    userId: string;
  }
}

// Zero-Trust Security Middleware applies to all routes
server.addHook('preHandler', securityMiddleware);

// Health check
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Main Webhook for WhatsApp / App integration
server.post<ChatRequest>('/api/v1/chat', async (request, reply) => {
  const { message, audioUrl, language, userId } = request.body;

  try {
    let textQuery = message;

    // Accessibility: Voice-First Flow
    if (audioUrl) {
      server.log.info({ userId }, 'Processing voice input via Bhashini');
      textQuery = await transcribeAudio(audioUrl, language);
    }

    if (!textQuery) {
      return reply.status(400).send({ error: 'Message or audioUrl is required' });
    }

    // AI Routing and Core Processing
    const responseText = await processQuery(textQuery, language, userId);

    // If original request was voice, provide audio response
    let responseAudioUrl = null;
    if (audioUrl) {
       responseAudioUrl = await synthesizeSpeech(responseText, language);
    }

    return reply.send({
      success: true,
      data: {
        text: responseText,
        audioUrl: responseAudioUrl,
        language
      }
    });

  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ 
      error: 'Internal Server Error',
      message: 'An error occurred while processing your request. Please try again.'
    });
  }
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8080', 10);
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
