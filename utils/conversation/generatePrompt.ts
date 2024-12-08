import { defaultLLMPrompt } from "@/rtvi.config";

// Define available services as a const enum for type safety
export const CommunityServices = {
    DISABLED_RESOURCES: "resources for the disabled",
    UNEMPLOYMENT_RESOURCES: "resources for the unemployed",
    FOOD_RESOURCES: "food resources",
    CLOTHING_HYGIENE: "clothing and hygiene resources",
    TRANSPORTATION: "transportation resources",
    MENTAL_HEALTH: "mental health resources",
    DOMESTIC_VIOLENCE: "assistance with domestic violence",
    EDUCATION: "education assistance",
    FINANCIAL: "financial assistance",
    HEALTHCARE: "health care resources",
    SHELTER: "shelter or housing",
    BRAIN_INJURY: "assistance with traumatic brain injuries"
  } as const;
  
  export type CommunityService = typeof CommunityServices[keyof typeof CommunityServices];
  
  // Types for the configuration structure
  interface ConfigOption {
    name: string;
    value: any;
  }
  
  interface ServiceConfig {
    service: string;
    options: ConfigOption[];
  }
  
  interface PromptTemplateParams {
    cbo_name: string;
    arr_services: CommunityService[];
  }
  
  // Function to validate if a string is a valid CommunityService
  const isValidService = (service: string): service is CommunityService => {
    return Object.values(CommunityServices).includes(service as CommunityService);
  };
  
  // Function to generate the prompt text
  const generatePromptText = (params: PromptTemplateParams): string => {
    // Validate that all services are valid
    const invalidServices = params.arr_services.filter(service => !isValidService(service));
    if (invalidServices.length > 0) {
      throw new Error(`Invalid services provided: ${invalidServices.join(', ')}`);
    }
  
    return defaultLLMPrompt
      .replace('{{cbo_name}}', params.cbo_name)
      .replace('{{arr_services}}', params.arr_services.join(', '));
  };
  
  // Main utility function to generate the configuration
  export const generateConfig = (
    baseConfig: ServiceConfig[],
    promptParams: PromptTemplateParams
  ): ServiceConfig[] => {
    return baseConfig.map(service => {
      if (service.service === 'llm') {
        return {
          ...service,
          options: service.options.map(option => {
            if (option.name === 'initial_messages') {
              return {
                ...option,
                value: [
                  {
                    role: 'system',
                    content: generatePromptText(promptParams),
                  },
                ],
              };
            }
            return option;
          }),
        };
      }
      return service;
    });
  };