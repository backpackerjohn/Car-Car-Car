import { createClient } from '@supabase/supabase-js';
import { CustomerProfile } from '../types';
import { INITIAL_CUSTOMER_PROFILE, CUSTOMERS_TABLE } from '../constants';
import { Database } from '../database.types';

// --- SUPABASE CLIENT INITIALIZATION ---
const supabaseUrl = 'https://dgobsgiulyhsepfqyspp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnb2JzZ2l1bHloc2VwZnF5c3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyODc4ODksImV4cCI6MjA3MDg2Mzg4OX0.YpBLO6W3uatMvJf97FVRQtmT1SA3yr-VcdAsmhpuWIo';

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL and Key must be provided.");
}

// Export the client for use in other services like messageService
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);


// --- UTILITY ---
/**
 * A utility for deep merging objects, crucial for progressive profile updates.
 * It intelligently merges new data into an existing profile without overwriting
 * existing valid data with empty, null, or undefined values.
 * @param {T} target The original customer profile object.
 * @param {Partial<T>} source The new data to merge in.
 * @returns {T} The merged customer profile.
 */
export const deepMerge = <T extends object>(target: T, source: Partial<T>): T => {
    const output = { ...target };
    if (target && source) {
        Object.keys(source).forEach(key => {
            const targetValue = target[key as keyof T];
            const sourceValue = source[key as keyof T];
            if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
                output[key as keyof T] = deepMerge(targetValue as object, sourceValue as object) as T[keyof T];
            } else {
                 if(sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
                    output[key as keyof T] = sourceValue;
                 }
            }
        });
    }
    return output;
};


// --- DATABASE OPERATIONS ---

/**
 * Retrieves all customer profiles from Supabase.
 * @returns {Promise<CustomerProfile[]>} An array of customer profiles.
 */
export const getCustomersFromStorage = async (): Promise<CustomerProfile[]> => {
    const { data, error } = await supabase
        .from(CUSTOMERS_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching customers from Supabase:", error);
        throw new Error(error.message);
    }
    return (data as any as CustomerProfile[]) || [];
};

/**
 * Creates a new customer with initial profile data in Supabase.
 * @returns {Promise<CustomerProfile>} The newly created customer profile.
 */
export const createNewCustomer = async (): Promise<CustomerProfile> => {
    const newCustomerData: Omit<CustomerProfile, 'id' | 'created_at'> = {
        ...INITIAL_CUSTOMER_PROFILE
    };
    
    const { data, error } = await supabase
        .from(CUSTOMERS_TABLE)
        .insert(newCustomerData)
        .select()
        .single();

    if (error) {
        console.error("Error creating customer in Supabase:", error);
        throw new Error(error.message);
    }
    
    return data as CustomerProfile;
};

/**
 * Updates a specific customer's profile in Supabase using a deep merge.
 * @param {string} customerId The ID of the customer to update.
 * @param {Partial<CustomerProfile>} data The partial data to merge into the customer's profile.
 * @returns {Promise<CustomerProfile | null>} The updated customer profile, or null if not found.
 */
export const updateCustomerInStorage = async (customerId: string, partialData: Partial<CustomerProfile>): Promise<CustomerProfile | null> => {
    const { data: currentCustomer, error: fetchError } = await supabase
        .from(CUSTOMERS_TABLE)
        .select('*')
        .eq('id', customerId)
        .single();

    if (fetchError || !currentCustomer) {
        console.error(`Error fetching customer ${customerId} for update:`, fetchError);
        return null;
    }

    const updatedData = deepMerge(currentCustomer as any as CustomerProfile, partialData);
    
    // Remove read-only fields from the payload before updating.
    const { id, created_at, ...updatePayload } = updatedData;

    const { data, error: updateError } = await supabase
        .from(CUSTOMERS_TABLE)
        .update(updatePayload)
        .eq('id', customerId)
        .select()
        .single();

    if (updateError) {
        console.error(`Error updating customer ${customerId} in Supabase:`, updateError);
        throw new Error(updateError.message);
    }
    
    return data as CustomerProfile;
};