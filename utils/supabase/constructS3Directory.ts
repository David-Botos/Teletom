export const constructS3Directory = (room_url: string): string => {
  const dailyUUID = process.env.DAILY_UUID

  if (!dailyUUID) {
    throw new Error('DAILY_UUID environment variable is not set')
  }

  return `${dailyUUID}/${room_url}/`
}