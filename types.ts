export interface CustomerProfile {
  id: string;
  created_at?: string;
  personal_info: {
    full_name: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    address: {
      full_address: string;
      street: string;
      city: string;
      state: string;
      zip: string;
    };
    drivers_license: {
      number: string;
      expiration: string;
      state: string;
      is_expired?: boolean;
    };
  };
  vehicle_info: {
    interest_vehicle: {
      year: string;
      make: string;
      model: string;
      stock_number: string;
      vin: string;
    };
    trade_vehicle: {
      year: string;
      make: string;
      model: string;
      vin: string;
      lien_holder: string;
      payoff_amount: number;
    };
    trade_in: boolean;
    purchase_type: 'new' | 'used' | '';
  };
  financial_info: {
    employment: {
      employer: string;
      position: string;
      income: number;
    };
    financing_needed: boolean;
    references: {
      name: string;
      phone: string;
      relationship: string;
    }[];
  };
  sales_info: {
    stage: 'initial_contact' | 'financing' | 'closing' | 'ongoing';
    salesperson: string;
  };
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  role: MessageRole;
  text: string;
  timestamp: string;
}

export type FormStage = 'initial_contact' | 'financing' | 'closing';

// Represents the schema for the `form_generations` table
export interface FormGeneration {
  id: string;
  customerId: string;
  formType: string;
  generatedAt: string; // ISO string
  pdfPath: string; // would be a URL to S3 in a real backend
}

export interface Form {
    id: string;
    name: string;
    stage: FormStage | 'always' | 'conditional';
}

export interface TemplateStatus {
    formId: string;
    uploaded: boolean;
    fileName: string | null;
}

export interface FieldMapping {
    // key: PDF field name, value: CustomerProfile dot notation path or special key
    [key: string]: string;
}