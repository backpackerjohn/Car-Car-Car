import { CustomerProfile, FieldMapping, Form } from '../types';
import { getMappingsForForm, getDiscoveredFields, getTemplateFile } from './templateService';
import { getValueByPath } from '../utils';
import { SALESPERSON_NAME } from '../constants';
import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup } from 'pdf-lib';

/**
 * Represents a single field and its auto-filled value for the PDF preview.
 */
export interface FilledField {
    pdfField: string;
    value: string;
    sourcePath: string;
}

// Special computed values that can be mapped in the UI.
const SPECIAL_HANDLERS: { [key: string]: (customer: CustomerProfile) => string } = {
    '__CURRENT_DATE__': () => new Date().toLocaleDateString('en-US'),
    '__SALESPERSON__': () => SALESPERSON_NAME,
    '__INTEREST_VEHICLE_YMM__': (c) => `${c.vehicle_info.interest_vehicle.year} ${c.vehicle_info.interest_vehicle.make} ${c.vehicle_info.interest_vehicle.model}`.trim(),
    '__TRADE_VEHICLE_YMM__': (c) => `${c.vehicle_info.trade_vehicle.year} ${c.vehicle_info.trade_vehicle.make} ${c.vehicle_info.trade_vehicle.model}`.trim(),
};

/**
 * A list of special, computed keys that can be selected in the field mapping UI.
 */
export const MAPPABLE_SPECIAL_KEYS = Object.keys(SPECIAL_HANDLERS);

// Fields that should be intentionally left blank for manual entry by the salesperson.
const FINANCIAL_FIELDS_TO_SKIP = ['SalePrice', 'DownPayment', 'PayoffAmount', 'AnnualIncome', 'SSN'];

/**
 * Generates the data that would be used to fill a PDF form, based on configured mappings.
 * This function powers the PDF preview modal.
 * @param {string} formId The ID of the form template.
 * @param {CustomerProfile} customer The customer's data profile.
 * @returns {Promise<FilledField[]>} An array of objects representing the fields to be filled.
 */
export const generatePreviewData = async (formId: string, customer: CustomerProfile): Promise<FilledField[]> => {
    const mappings = await getMappingsForForm(formId);
    const discoveredFields = await getDiscoveredFields(formId);
    const filledData: FilledField[] = [];

    for (const pdfField of discoveredFields) {
        // Skip certain financial fields to allow manual entry
        if (FINANCIAL_FIELDS_TO_SKIP.includes(pdfField)) {
            filledData.push({ pdfField, value: '[Manual Entry]', sourcePath: 'N/A' });
            continue;
        }

        const mappedPath = mappings[pdfField];
        let value: any = '';

        if (mappedPath) {
            // Check if it's a special computed value
            if (SPECIAL_HANDLERS[mappedPath]) {
                value = SPECIAL_HANDLERS[mappedPath](customer);
            } else {
                // Otherwise, get the value from the customer profile
                value = getValueByPath(customer, mappedPath);
            }
        }
        
        // Format the value for display
        if (value === undefined || value === null || value === '') {
            value = '---';
        } else if (typeof value === 'boolean') {
            value = value ? 'Yes' : 'No';
        } else if (typeof value === 'number' && value === 0) {
            value = '---';
        }

        filledData.push({
            pdfField,
            value: String(value),
            sourcePath: mappedPath || 'Not Mapped',
        });
    }

    return filledData;
};

/**
 * Generates a filled PDF file as a byte array.
 * @param {string} formId The ID of the form template.
 * @param {CustomerProfile} customer The customer's data profile.
 * @returns {Promise<Uint8Array>} A promise that resolves with the bytes of the filled PDF.
 */
export const generatePdfBytes = async (form: Form, customer: CustomerProfile): Promise<Uint8Array> => {
    const templateBase64 = await getTemplateFile(form.id);
    if (!templateBase64) {
        throw new Error(`Template file not found for form: ${form.name}`);
    }

    const pdfDoc = await PDFDocument.load(templateBase64);
    const pdfForm = pdfDoc.getForm();
    const previewData = await generatePreviewData(form.id, customer);

    for (const fieldData of previewData) {
        if (fieldData.value !== '---' && fieldData.value !== '[Manual Entry]') {
            try {
                const field = pdfForm.getField(fieldData.pdfField);
                if (field instanceof PDFTextField) {
                    field.setText(fieldData.value);
                } else if (field instanceof PDFCheckBox) {
                    if (['yes', 'true', 'on'].includes(fieldData.value.toLowerCase())) {
                        field.check();
                    } else {
                        field.uncheck();
                    }
                } else if (field instanceof PDFRadioGroup) {
                    field.select(fieldData.value);
                }
            } catch (error) {
                console.warn(`Could not fill field '${fieldData.pdfField}' on form '${form.name}'. It may not exist on the PDF.`, error);
            }
        }
    }
    
    // Flatten the form to make fields non-editable, like a real dealership would.
    pdfForm.flatten();

    return await pdfDoc.save();
};
