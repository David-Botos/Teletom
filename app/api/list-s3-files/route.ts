import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createS3Client } from '@/utils/s3/createS3Client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get('prefix');

  if (!prefix) {
    return Response.json({ error: 'Prefix parameter is required' }, { status: 400 });
  }

  try {
    const client = createS3Client();

    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET,
      Prefix: prefix,
    });

    const listed = await client.send(listCommand);

    if (!listed.Contents || listed.Contents.length === 0) {
      return Response.json({ error: 'No files found in directory' }, { status: 404 });
    }

    return Response.json({
      files: listed.Contents.map((file) => ({
        key: file.Key,
        size: file.Size,
        lastModified: file.LastModified,
      })),
    });
  } catch (error) {
    console.error('Error listing files:', error);
    return Response.json({ error: 'Failed to list files' }, { status: 500 });
  }
}
