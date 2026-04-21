import { FastifyRequest, FastifyReply } from 'fastify';
import { sanitizeInput, detectPromptInjection } from '../services/security';

export async function securityMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // 1. IP and Rate Limiting check should be handled by Google Cloud Armor / API Gateway in prod
  
  // 2. Body inspection
  if (request.body) {
    const bodyStr = JSON.stringify(request.body);
    
    // 3. Prompt Injection Detection
    if (detectPromptInjection(bodyStr)) {
      request.log.warn({ ip: request.ip }, 'Potential prompt injection detected');
      return reply.status(403).send({ error: 'Forbidden: Malicious input detected' });
    }

    // 4. Input Sanitization and PII Redaction
    // We sanitize strings to prevent XSS/NoSQL injections
    // We redact Aadhaar/Voter ID in the middleware before the controller sees it
    const sanitizedBody = sanitizeInput(request.body);
    request.body = sanitizedBody;
  }
  
  // 5. Auth Token Validation
  // Implementation of Zero-Trust identity verification (e.g. verifying JWT from Identity Aware Proxy or WhatsApp)
  const authHeader = request.headers.authorization;
  if (!authHeader) {
     // For demo purposes, we might allow no auth, but in a true zero-trust model:
     // return reply.status(401).send({ error: 'Unauthorized' });
  }
}
