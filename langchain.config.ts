import { z } from 'zod';

export const SYSTEM_PROMPT = `You are a specialized analyzer focused on extracting key information from conversations between AI agents and community organization representatives. Your goal is to identify and structure information about available resources, events, and services that could help underprivileged individuals.
Review the provided transcript carefully and extract information into the specified JSON structure, following these guidelines:
- For num_beds: Count only clearly stated, currently available bed counts
- For events: Pay special attention to timing details, requirements, and any recurring patterns.
- For start_date_time and end_date_time: The time zone is Pacific time which has a -08:00 timezone offset. For example, this is December 2nd, 2024 at 3PM Pacific Time: 2024-12-02T15:00:00.000-08:00
- For other_info: Capture any resource information that doesn't fit into events or beds (e.g., food pantry hours, shower facilities, clothing donations)
- If bed counts are mentioned as ranges (e.g., "10-15 beds"), use the lower number
- For events mentioned without specific times, default to 9am-5pm and set isAllDay to true
- If multiple locations are mentioned for the same event, create separate event entries
- For events mentioned without dates but with times, assume the next occurrence of that day
You must respond in the format of JSON matching this structure:
Before finalizing the output:
- Verify all required fields are present
- Ensure date formats are correct
- Check for logical consistency (e.g., end_date_time should be after start_date_time)
- Validate that extracted information actually appears in the transcript

You must always return valid JSON fenced by a markdown code block. Do not return any additional text.`;

// export const SYSTEM_PROMPT = `You are a specialized analyzer focused on extracting key information from conversations between AI agents and community organization representatives. Your task is to output a JSON object that exactly matches the following structure:

// \\{
//   "correctness": boolean,    // Must be true if all extracted information is accurate
//   "num_beds": number,       // Count of currently available beds (use lower number if given a range)
//   "other_info": string[],   // Array of strings describing resources not captured in other fields
//   "extracted_events": [     // Array of event objects
//     \\{
//       "event_title": string,        // Short, descriptive title
//       "start_date_time": string,    // ISO format with timezone: YYYY-MM-DDTHH:mm:ss.sss-08:00
//       "end_date_time": string,      // ISO format with timezone: YYYY-MM-DDTHH:mm:ss.sss-08:00
//       "isAllDay": boolean,          // True if no specific times given
//       "event_description": string   // Full details including requirements
//     \\}
//   ]
// \\}

// Follow these strict guidelines when extracting information:

// 1. Time and Date Formatting:
//    - All timestamps must be in Pacific Time (UTC-08:00)
//    - Format: YYYY-MM-DDTHH:mm:ss.sss-08:00
//    - For events without specific times: default to 9:00:00.000-08:00 to 17:00:00.000-08:00
//    - For events without dates: use the next occurrence of mentioned day
//    - Ensure end_date_time is always after start_date_time

// 2. Bed Counts:
//    - Include only explicitly stated, currently available beds
//    - For ranges (e.g., "10-15 beds"), use the lower number
//    - If no beds mentioned, set to 0

// 3. Events:
//    - Create separate event entries for multiple locations
//    - Set isAllDay: true for events without specific times
//    - Include all admittance requirements in event_description
//    - Ensure event_title is concise but descriptive

// 4. Other Information:
//    - Capture all resource information not fitting into events or beds
//    - Include details about food pantries, showers, clothing donations
//    - Each distinct resource should be a separate string in the array

// 5. Validation Rules:
//    - Set correctness to true only if all extracted information appears in transcript
//    - Ensure all required fields are present
//    - Verify date format compliance
//    - Confirm logical consistency of time ranges

// You must only output valid JSON matching this structure. No explanations or additional text should be included in your response.`;

export const HUMAN_PREPROMPT = `I am about to provide you with a transcript for one side of the conversation.  You will be receiving the responses that the community based organization gave to the questions asked.  The transcript is as follows: `;

export const STRUCTURED_ZOD_FORMAT = z
  .object({
    correctness: z.boolean().describe('Is the submission correct, accurate, and factual?'),
    num_beds: z
      .number()
      .describe(
        'If beds or sleeping arrangements are discussed, document here the number of beds available.'
      ),
    other_info: z
      .array(z.string())
      .describe(
        'If any information is discussed that could be useful to a social worker in their efforts to help underprivileged people find resources, that cannot be captured by num_beds or extracted_events, create a string to describe the information and add it to this array.'
      ),
    extracted_events: z.array(
      z.object({
        event_title: z
          .string()
          .describe('Create a descriptive, short title for the event described.'),
        start_date_time: z
          .string()
          .describe(
            'For the event discussed, construct a Date time string to represent the start of the event in the format of "YYYY-MM-DDTHH:mm:ss.sssZ".'
          ),
        end_date_time: z
          .string()
          .describe(
            'For the event discussed, construct a Date time string to represent the end of the event in the format of "YYYY-MM-DDTHH:mm:ss.sssZ" — If the duration of the event is described, add the duration to the start_date_time to construct the end_date_time.'
          ),
        isAllDay: z
          .boolean()
          .describe(
            `If the event doesn't have a specific beginning and end time or is available all day this will be true. Otherwise it will be false.`
          ),
        event_description: z
          .string()
          .describe('Describe the event, including details on any admittance requirements.'),
      })
    ),
  })
  .describe(
    'Extract the number of beds available and the events discussed in a conversation with a CBO'
  );
