
import * as hub from 'langchain/hub';
export const handleAnalysis = async () => {
  const prompt = await hub.pull('extract_beds_and_events');
};
