import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function fetchRecording(prefix: string, returnBot: boolean = true): Promise<Buffer> {
  const client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  // List files in the nested directory
  const listCommand = new ListObjectsV2Command({
    Bucket: process.env.S3_BUCKET,
    Prefix: prefix,
  });

  const listed = await client.send(listCommand);
  if (!listed.Contents || listed.Contents.length === 0) {
    throw new Error('No files found in directory');
  }

  // Select first or second file
  const selectedFile = returnBot ? listed.Contents[0] : listed.Contents[1];
  if (!selectedFile?.Key) {
    throw new Error(`Unable to find ${returnBot ? 'bot recording' : 'CBO recording'} file`);
  }

  // Fetch the selected file
  const getCommand = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: selectedFile.Key,
  });

  const response = await client.send(getCommand);
  const data = await response.Body?.transformToByteArray();
  if (!data) throw new Error('No data received');
  return Buffer.from(data);
}
