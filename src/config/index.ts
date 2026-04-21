import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

export const config = {
  gcpProjectId: process.env.GOOGLE_CLOUD_PROJECT || 'eci-jan-mat-project',
  location: process.env.LOCATION || 'asia-south1', // Vertex AI location (Mumbai)
  milvus: {
    address: process.env.MILVUS_ADDRESS || 'localhost:19530',
    username: process.env.MILVUS_USERNAME || 'root',
    password: process.env.MILVUS_PASSWORD || 'password'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-dev-key-change-me'
};

export async function getSecret(secretName: string): Promise<string> {
  try {
    const [version] = await client.accessSecretVersion({
      name: `projects/${config.gcpProjectId}/secrets/${secretName}/versions/latest`,
    });
    return version.payload?.data?.toString() || '';
  } catch (error) {
    console.warn(`Failed to fetch secret ${secretName}, falling back to env.`);
    return process.env[secretName] || '';
  }
}
