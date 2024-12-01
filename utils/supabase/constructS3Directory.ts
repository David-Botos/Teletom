export const constructS3Directory = (room_url: string): string => {
  const dailyUUID = 'pc-cd57ca24cb0e4f41a298bb66080e1ce1';
  if (!dailyUUID) {
    throw new Error('DAILY_UUID environment variable is not set');
  }

  // Extract the dailybot ID from the URL
  const dailybotMatch = room_url.match(/dailybot[a-f0-9]+/);
  if (!dailybotMatch) {
    throw new Error('Invalid room URL format: dailybot ID not found');
  }

  return `${dailyUUID}/${dailybotMatch[0]}/`;
};
