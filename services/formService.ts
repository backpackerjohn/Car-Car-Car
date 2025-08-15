import { CustomerProfile, FormStage, Form } from '../types';
import { ALL_FORMS } from '../constants';

/**
 * Determines the customer's current stage in the sales process based on available data.
 * @param {CustomerProfile} customer The customer's profile.
 * @returns {FormStage} The determined sales stage ('initial_contact', 'financing', or 'closing').
 */
export const determineStage = (customer: CustomerProfile): FormStage => {
  const { personal_info, financial_info, vehicle_info } = customer;

  // Closing stage: Assumes a deal is being finalized.
  // Requires specific vehicle and customer identification.
  if (vehicle_info.interest_vehicle.vin && personal_info.drivers_license.number) {
    return 'closing';
  }

  // Financing stage: Customer has expressed need for financing and basic info is present.
  if (financial_info.financing_needed && personal_info.full_name && personal_info.phone) {
    return 'financing';
  }
  
  // Initial contact: The default starting stage.
  return 'initial_contact';
};

/**
 * Gets the list of forms required for a customer based on their sales stage and specific data conditions.
 * @param {CustomerProfile} customer The customer's profile.
 * @returns {Array<{ form: Form; reason: string }>} An array of objects, each containing the form and the reason it's required.
 */
export const getRequiredForms = (customer: CustomerProfile): { form: Form; reason: string }[] => {
    const stage = determineStage(customer);
    const requiredForms = new Map<string, { form: Form; reason: string }>();

    // Stage-based forms
    ALL_FORMS
        .filter(f => f.stage === stage)
        .forEach(f => requiredForms.set(f.id, { form: f, reason: `Stage: ${stage.replace('_', ' ')}` }));

    // Conditional forms are checked regardless of stage
    if (customer.vehicle_info.purchase_type === 'new') {
        const form = ALL_FORMS.find(f => f.id === 'oil_changes_form');
        if (form) requiredForms.set(form.id, { form, reason: 'New Vehicle' });
    }
    if (customer.vehicle_info.trade_in) {
        const form = ALL_FORMS.find(f => f.id === 'payoff_authorization');
        if (form) requiredForms.set(form.id, { form, reason: 'Has Trade-In' });
    }
    
    // During the closing stage, also include all forms marked as 'always' required.
    if (stage === 'closing') {
        ALL_FORMS
            .filter(f => f.stage === 'always')
            .forEach(f => requiredForms.set(f.id, { form: f, reason: 'Required for Sale' }));
    }

    return Array.from(requiredForms.values());
};

export interface FormReadiness {
    isReady: boolean;
    warnings: string[];
}

/**
 * Validates if a specific form has all the required data in the customer profile.
 * This is used to display warnings in the UI before PDF generation.
 * @param {string} formId The ID of the form to check (e.g., 'test_drive_agreement').
 * @param {CustomerProfile} customer The customer's profile.
 * @returns {FormReadiness} An object containing a readiness flag and a list of warnings for missing data.
 */
export const getFormReadiness = (formId: string, customer: CustomerProfile): FormReadiness => {
    const warnings: string[] = [];
    const { personal_info, vehicle_info, financial_info } = customer;

    switch (formId) {
        case 'interview_sheet':
            if (!personal_info.full_name) warnings.push("Missing customer name.");
            if (!personal_info.phone) warnings.push("Missing phone number.");
            if (!personal_info.email) warnings.push("Missing email address.");
            break;
            
        case 'test_drive_agreement':
            if (!personal_info.full_name) warnings.push("Missing customer name.");
            if (!personal_info.drivers_license.number) warnings.push("Missing driver's license number.");
            if (!personal_info.drivers_license.expiration) warnings.push("Missing license expiration date.");
            if (!vehicle_info.interest_vehicle.make || !vehicle_info.interest_vehicle.model) warnings.push("Missing vehicle of interest.");
            break;

        case 'credit_application':
            if (!personal_info.full_name) warnings.push("Missing customer name.");
            if (!personal_info.address.full_address) warnings.push("Missing customer address.");
            if (!financial_info.employment.employer) warnings.push("Missing employment information.");
            break;

        case 'reference_sheet':
             if (!personal_info.full_name) warnings.push("Missing customer name.");
             if (financial_info.references.length < 1) warnings.push("At least one reference is required.");
             break;

        case 'delivery_report':
            if (!personal_info.full_name) warnings.push("Missing customer name.");
            if (!vehicle_info.interest_vehicle.vin) warnings.push("Missing VIN for vehicle of interest.");
            break;

        case 'privacy_policy':
        case 'deal_check_list':
            if (!personal_info.full_name) warnings.push("Missing customer name.");
            break;

        case 'oil_changes_form':
            if (!personal_info.full_name) warnings.push("Missing customer name.");
            if (!vehicle_info.interest_vehicle.model) warnings.push("Missing vehicle model.");
            break;

        case 'payoff_authorization':
            if (!personal_info.full_name) warnings.push("Missing customer name.");
            if (!vehicle_info.trade_vehicle.vin) warnings.push("Missing trade-in vehicle VIN.");
            if (!vehicle_info.trade_vehicle.lien_holder) warnings.push("Missing trade-in lien holder.");
            break;

        default:
            break;
    }

    return { isReady: warnings.length === 0, warnings };
};
