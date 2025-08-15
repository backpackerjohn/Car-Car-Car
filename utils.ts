import { CustomerProfile } from './types';
import { INITIAL_CUSTOMER_PROFILE } from './constants';

/**
 * Retrieves a nested value from an object using a dot-notation string path.
 * @param obj The object to query.
 * @param path The dot-notation path (e.g., 'personal_info.address.city').
 * @returns The value at the specified path, or undefined if not found.
 */
export const getValueByPath = (obj: any, path: string): any => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

/**
 * Recursively generates a flat list of dot-notation keys from a nested object.
 * @param obj The object to process.
 * @param path The current path prefix.
 * @returns An array of flat keys.
 */
const generateFlatKeys = (obj: any, path: string = ''): string[] => {
    return Object.keys(obj).reduce((acc: string[], key: string) => {
        const newPath = path ? `${path}.${key}` : key;
        const value = obj[key];

        // We only want to recurse into objects, not arrays of objects like 'references'.
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return [...acc, ...generateFlatKeys(value, newPath)];
        }
        return [...acc, newPath];
    }, []);
};

// Memoize the result so we don't recalculate it constantly.
let flatKeys: string[] | null = null;
export const getCustomerProfileFlatKeys = (): string[] => {
    if (!flatKeys) {
        // We use the initial profile as a schema to generate keys.
        flatKeys = generateFlatKeys(INITIAL_CUSTOMER_PROFILE);
    }
    return flatKeys;
};
