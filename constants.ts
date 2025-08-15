
import { CustomerProfile, Form } from './types';

export const CUSTOMERS_TABLE = 'customers';
export const MESSAGES_TABLE = 'messages';

export const SALESPERSON_NAME = "Stephen Schreck";

export const INITIAL_CUSTOMER_PROFILE: Omit<CustomerProfile, 'id'> = {
  personal_info: {
    full_name: '',
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: {
      full_address: '',
      street: '',
      city: '',
      state: '',
      zip: '',
    },
    drivers_license: {
      number: '',
      expiration: '',
      state: 'OH',
    },
  },
  vehicle_info: {
    interest_vehicle: {
      year: '',
      make: '',
      model: '',
      stock_number: '',
      vin: '',
    },
    trade_vehicle: {
      year: '',
      make: '',
      model: '',
      vin: '',
      lien_holder: '',
      payoff_amount: 0,
    },
    trade_in: false,
    purchase_type: '',
  },
  financial_info: {
    employment: {
      employer: '',
      position: '',
      income: 0,
    },
    financing_needed: false,
    references: [],
  },
  sales_info: {
    stage: 'initial_contact',
    salesperson: SALESPERSON_NAME,
  },
};

export const ALL_FORMS: Form[] = [
    { id: 'interview_sheet', name: 'Interview Sheet', stage: 'initial_contact' },
    { id: 'test_drive_agreement', name: 'Test Drive Agreement', stage: 'initial_contact' },
    { id: 'credit_application', name: 'Credit Application (F&I)', stage: 'financing' },
    { id: 'reference_sheet', name: 'Reference Sheet', stage: 'financing' },
    { id: 'delivery_report', name: 'Delivery Report', stage: 'always' },
    { id: 'privacy_policy', name: 'Privacy Policy', stage: 'always' },
    { id: 'deal_check_list', name: 'Deal Check List', stage: 'always' },
    { id: 'oil_changes_form', name: 'Oil Changes Form', stage: 'conditional' },
    { id: 'payoff_authorization', name: 'Payoff Authorization Sheet', stage: 'conditional' },
];