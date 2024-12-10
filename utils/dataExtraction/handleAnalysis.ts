export type ExtractedEvent = {
  event_title: string;
  start_date_time: string;
  end_date_time: string;
  isAllDay: boolean;
  event_description: string;
};

export type BedsAndEventsOutput = {
  correctness: boolean;
  num_avail_beds: number;
  num_total_beds: number;
  other_info: string[];
  extracted_events: ExtractedEvent[];
};

export type ShelterAnalysisOutput = {
  // Basic metadata
  correctness: boolean;
  timestamp: string;
  shelter_name: string;

  // Capacity information
  capacity: {
    num_avail_beds: number | null;
    num_total_beds: number | null;
    capacity_notes?: string;
    expected_availability?: string;
  };

  // Access model
  access_type: 'direct_access' | 'referral_only' | 'hybrid';
  intake_process: {
    intake_hours?: string;
    intake_location?: string;
    intake_requirements: string[];
    referral_sources: string[];
    wait_time?: string;
  };

  // Population served
  population_served: {
    gender_restrictions: string[];
    age_restrictions: string[];
    other_restrictions: string[];
  };

  // Services offered
  services: {
    housing_types: string[];
    support_services: string[];
    program_details: string[];
  };

  // Referral process
  referral_process: {
    referral_method: 'email' | 'phone' | 'in_person' | 'multiple';
    referral_contact?: string;
    referral_requirements: string[];
    referral_timeline?: string;
  };

  // Key contacts
  contacts: Array<{
    name: string;
    role: string;
    contact_info: string;
    best_time_to_contact?: string;
  }>;

  // Events
  extracted_events: Array<{
    event_title: string;
    start_date_time: string;
    end_date_time: string;
    isAllDay: boolean;
    event_description: string;
  }>;

  // Additional information
  other_info: string[];

  // Vulnerability criteria
  vulnerability_criteria: string[];

  // Alternative referrals
  alternative_resources: Array<{
    organization_name: string;
    service_type: string;
    contact_info?: string;
    notes?: string;
  }>;
};

export const handleAnalysis = async (transcript: string): Promise<ShelterAnalysisOutput> => {
  try {
    const response = await fetch('/api/analyze-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: transcript,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error, { cause: errorData.details });
    }

    const extractedInformation = await response.json();
    return extractedInformation;
  } catch (error) {
    throw error;
  }
};
