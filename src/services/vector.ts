import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import Redis from 'ioredis';
import { config } from '../config';
import * as crypto from 'crypto';

const milvusClient = new MilvusClient(config.milvus.address);
const redis = new Redis({ host: config.redis.host, port: config.redis.port });

/**
 * Searches Milvus Vector DB for FAQs.
 * Leverages Redis caching for O(1) typical response time.
 * Milvus index search is typically O(log n).
 */
export async function searchMilvus(query: string): Promise<string> {
  // Cache key based on hash of query
  const cacheKey = `faq:${crypto.createHash('md5').update(query).digest('hex')}`;
  
  // O(1) Redis Lookup
  const cachedResult = await redis.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Generate vector embeddings for the query (Mocked for brevity)
  const queryVector = new Array(768).fill(0).map(() => Math.random());

  try {
    // O(log n) ANN Search in Milvus
    const res = await milvusClient.search({
      collection_name: 'eci_faqs',
      vector: queryVector,
      output_fields: ['answer', 'context'],
      limit: 3,
    });

    if (res.status.error_code !== 'Success' || res.results.length === 0) {
      return "I could not find relevant information in the official guidelines.";
    }

    const answer = res.results.map((r: any) => r.answer).join('\n\n');
    
    // Cache the result for 24 hours
    await redis.setex(cacheKey, 86400, answer);
    
    return answer;
  } catch (error) {
    console.error("Vector Search Error:", error);
    return "The knowledge base is currently unreachable.";
  }
}
