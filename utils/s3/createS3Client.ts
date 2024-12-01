import { S3Client } from '@aws-sdk/client-s3';

export function createS3Client() {
  const s3_key = process.env.TELETOM_S3_KEY;
  const s3_secret_key = process.env.TELETOM_S3_SECRET_KEY;

  if (!s3_key || !s3_secret_key) {
    throw new Error(
      '❌ Teletom programmatic access keys are missing from the env and needed to fetch recordings'
    );
  }

  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: s3_key,
      secretAccessKey: s3_secret_key,
    },
  });
}
