import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client } from '@/utils/s3/createS3Client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return Response.json({ error: 'Key parameter is required' }, { status: 400 });
  }

  try {
    const client = createS3Client();

    const getCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    });

    const signedUrl = await getSignedUrl(client, getCommand, { expiresIn: 3600 });

    return Response.json({ url: signedUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return Response.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
}
