import { z } from 'zod';

export const SYSTEM_PROMPT = `You are a specialized analyzer focused on extracting key information from conversations between AI agents and community organization representatives. Your goal is to identify and structure information about available resources, events, and services that could help underprivileged individuals.
Review the provided transcript carefully and extract information into the specified JSON structure, following these guidelines:
- For num_avail_beds: Count only clearly stated, currently available bed counts.
- For num_total_beds: Count all the beds available at the shelter.
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
    num_avail_beds: z
      .number()
      .describe('The number of beds available at the time of the call for people to claim.'),
    num_total_beds: z
      .number()
      .describe('The number of total beds at the shelter, both claimed and unclaimed'),
    other_info: z
      .array(z.string())
      .describe(
        'If any information is discussed that could be useful to a social worker in their efforts to help underprivileged people find resources, that is not related to beds or events, create a string to describe the information and add it to this array.'
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

export const SHELTER_CALL_SCHEMA = z
  .object({
    // Basic metadata
    correctness: z.boolean().describe('Is the submission correct, accurate, and factual?'),
    timestamp: z.string().describe('When the call was made in ISO format'),
    shelter_name: z.string().describe('Name of the shelter or facility'),

    // Capacity information
    capacity: z.object({
      num_avail_beds: z.number().nullable().describe('Current number of available beds'),
      num_total_beds: z.number().nullable().describe('Total bed capacity'),
      capacity_notes: z
        .string()
        .optional()
        .describe('Any qualifiers about capacity (e.g., "reduced due to construction")'),
      expected_availability: z
        .string()
        .optional()
        .describe('Information about when beds might become available'),
    }),

    // Access model
    access_type: z
      .enum(['direct_access', 'referral_only', 'hybrid'])
      .describe('How people can access the shelter'),
    intake_process: z.object({
      intake_hours: z.string().optional().describe('When intake is available'),
      intake_location: z.string().optional().describe('Where to go for intake'),
      intake_requirements: z
        .array(z.string())
        .describe('Required documents or conditions for intake'),
      referral_sources: z
        .array(z.string())
        .describe('Accepted sources for referrals (e.g., "hospital social worker")'),
      wait_time: z.string().optional().describe('Expected wait time for placement'),
    }),

    // Population served
    population_served: z.object({
      gender_restrictions: z.array(z.string()).describe('Gender requirements if any'),
      age_restrictions: z.array(z.string()).describe('Age requirements if any'),
      other_restrictions: z.array(z.string()).describe('Other eligibility requirements'),
    }),

    // Services offered
    services: z.object({
      housing_types: z
        .array(z.string())
        .describe('Types of housing offered (e.g., "emergency", "transitional", "permanent")'),
      support_services: z
        .array(z.string())
        .describe('Additional services offered (e.g., "mental health", "substance abuse")'),
      program_details: z.array(z.string()).describe('Details about specific programs offered'),
    }),

    // Referral process
    referral_process: z.object({
      referral_method: z.enum(['email', 'phone', 'in_person', 'multiple']),
      referral_contact: z.string().optional().describe('Contact information for referrals'),
      referral_requirements: z.array(z.string()).describe('Requirements for making referrals'),
      referral_timeline: z.string().optional().describe('Expected timeline for referral process'),
    }),

    // Key contacts
    contacts: z.array(
      z.object({
        name: z.string(),
        role: z.string(),
        contact_info: z.string(),
        best_time_to_contact: z.string().optional(),
      })
    ),

    // Events (keeping your original structure)
    extracted_events: z.array(
      z.object({
        event_title: z.string(),
        start_date_time: z.string(),
        end_date_time: z.string(),
        isAllDay: z.boolean(),
        event_description: z.string(),
      })
    ),

    // Additional information
    other_info: z
      .array(z.string())
      .describe('Additional useful information not captured in other fields'),

    // Vulnerability criteria
    vulnerability_criteria: z
      .array(z.string())
      .describe('Factors that affect priority for placement'),

    // Alternative referrals
    alternative_resources: z.array(
      z.object({
        organization_name: z.string(),
        service_type: z.string(),
        contact_info: z.string().optional(),
        notes: z.string().optional(),
      })
    ),
  })
  .describe('Structured data extracted from shelter availability calls');

// First, let's create a JSON schema that matches your Zod schema but in the format Gemini expects
export const JSON_SHELTER_CALL_SCHEMA = {
  name: 'shelter_analysis',
  description: 'Structured data extracted from shelter availability calls',
  parameters: {
    type: 'object',
    properties: {
      correctness: {
        type: 'boolean',
        description: 'Is the submission correct, accurate, and factual?',
      },
      timestamp: {
        type: 'string',
        description: 'When the call was made in ISO format',
      },
      shelter_name: {
        type: 'string',
        description: 'Name of the shelter or facility',
      },
      capacity: {
        type: 'object',
        properties: {
          num_avail_beds: {
            type: 'number',
            description: 'Current number of available beds',
            nullable: true,
          },
          num_total_beds: {
            type: 'number',
            description: 'Total bed capacity',
            nullable: true,
          },
          capacity_notes: {
            type: 'string',
            description: 'Any qualifiers about capacity',
          },
          expected_availability: {
            type: 'string',
            description: 'Information about when beds might become available',
          },
        },
      },
      access_type: {
        type: 'string',
        enum: ['direct_access', 'referral_only', 'hybrid'],
        description: 'How people can access the shelter',
      },
      intake_process: {
        type: 'object',
        properties: {
          intake_hours: {
            type: 'string',
            description: 'When intake is available',
          },
          intake_location: {
            type: 'string',
            description: 'Where to go for intake',
          },
          intake_requirements: {
            type: 'array',
            items: { type: 'string' },
            description: 'Required documents or conditions for intake',
          },
          referral_sources: {
            type: 'array',
            items: { type: 'string' },
            description: 'Accepted sources for referrals',
          },
          wait_time: {
            type: 'string',
            description: 'Expected wait time for placement',
          },
        },
      },
      population_served: {
        type: 'object',
        properties: {
          gender_restrictions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Gender requirements if any',
          },
          age_restrictions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Age requirements if any',
          },
          other_restrictions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Other eligibility requirements',
          },
        },
      },
      services: {
        type: 'object',
        properties: {
          housing_types: {
            type: 'array',
            items: { type: 'string' },
          },
          support_services: {
            type: 'array',
            items: { type: 'string' },
          },
          program_details: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      referral_process: {
        type: 'object',
        properties: {
          referral_method: {
            type: 'string',
            enum: ['email', 'phone', 'in_person', 'multiple'],
          },
          referral_contact: {
            type: 'string',
          },
          referral_requirements: {
            type: 'array',
            items: { type: 'string' },
          },
          referral_timeline: {
            type: 'string',
          },
        },
      },
      contacts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            role: { type: 'string' },
            contact_info: { type: 'string' },
            best_time_to_contact: { type: 'string' },
          },
          required: ['name', 'role', 'contact_info'],
        },
      },
      extracted_events: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            event_title: { type: 'string' },
            start_date_time: { type: 'string' },
            end_date_time: { type: 'string' },
            isAllDay: { type: 'boolean' },
            event_description: { type: 'string' },
          },
          required: [
            'event_title',
            'start_date_time',
            'end_date_time',
            'isAllDay',
            'event_description',
          ],
        },
      },
      other_info: {
        type: 'array',
        items: { type: 'string' },
      },
      vulnerability_criteria: {
        type: 'array',
        items: { type: 'string' },
      },
      alternative_resources: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            organization_name: { type: 'string' },
            service_type: { type: 'string' },
            contact_info: { type: 'string' },
            notes: { type: 'string' },
          },
          required: ['organization_name', 'service_type'],
        },
      },
    },
    required: ['correctness', 'timestamp', 'shelter_name', 'access_type'],
  },
};

export const SHELTER_ANALYSIS_PROMPT_v2 = `You are a data extraction specialist analyzing a conversation transcript between a shelter representative and someone inquiring about shelter availability. Your task is to extract specific information and structure it according to a predefined schema.

Follow these steps:

1. First, carefully read the entire transcript.

2. For each piece of information you identify, categorize it according to these key areas:
   - Basic shelter information (name, contact details)
   - Current capacity and bed availability
   - Intake process and requirements
   - Population served and restrictions
   - Services offered
   - Referral process details
   - Key contacts mentioned
   - Events or programs discussed
   - Alternative resources mentioned
   - Any vulnerability criteria discussed

3. For each field:
   - Only include information explicitly stated in the transcript
   - Mark fields as null if information is not provided
   - Include relevant context or qualifiers in notes fields
   - Maintain exact numbers, dates, and times as stated
   - Capture any uncertainty or variability mentioned (e.g., "approximately 40 beds")

Important guidelines:
- Do not infer or assume information not explicitly stated
- Capture qualifiers and conditions exactly as described
- Include relevant context in appropriate notes fields
- Maintain temporal information (dates, times, durations) precisely
- Flag any ambiguous or uncertain information
- Record all mentioned alternative resources or referral options

Please process the following transcript and provide the structured data in the specified JSON format:`;
