import { TemplateStatus, FieldMapping } from '../types';
import { ALL_FORMS } from '../constants';
import { PDFDocument } from 'pdf-lib';
import { supabase } from './customerService';

const PDF_TEMPLATES_TABLE = 'pdf_templates';
const TEMPLATES_BUCKET = 'templates';

// Helper to convert Blob to Base64, needed for pdf-lib in the generation service
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            resolve(reader.result as string);
        };
        reader.onerror = (error) => {
            reject(error);
        };
    });
};

/**
 * Ensures the pdf_templates table is populated with initial form records.
 */
const initializeTemplates = async () => {
    const { count, error: countError } = await supabase.from(PDF_TEMPLATES_TABLE).select('*', { count: 'exact', head: true });

    if (countError) {
        console.error("Error checking template count:", countError);
        throw countError;
    }

    if (count === null || count < ALL_FORMS.length) {
        const initialTemplates = ALL_FORMS.map(form => ({
            id: form.id,
            name: form.name,
        }));
        // Upsert to avoid race conditions or duplicate entries
        const { error: upsertError } = await supabase.from(PDF_TEMPLATES_TABLE).upsert(initialTemplates, { onConflict: 'id' });
        if (upsertError) {
             console.error("Error initializing templates:", upsertError);
            throw upsertError;
        }
    }
};

/**
 * Gets the upload status for all templates from Supabase.
 * @returns {Promise<TemplateStatus[]>} An array of status objects for each form template.
 */
export const getTemplateStatuses = async (): Promise<TemplateStatus[]> => {
    await initializeTemplates();

    const { data, error } = await supabase.from(PDF_TEMPLATES_TABLE).select('id, file_name, storage_path');
    if (error) {
        console.error("Error fetching template statuses:", error);
        throw error;
    }

    return ALL_FORMS.map(form => {
        const dbTemplate = data.find(t => t.id === form.id);
        return {
            formId: form.id,
            uploaded: !!dbTemplate?.storage_path,
            fileName: dbTemplate?.file_name || null,
        };
    });
};

/**
 * Uploads a PDF, discovers its fields, saves it to Supabase Storage, and updates the DB record.
 * @param {string} formId The ID of the form template.
 * @param {File} file The uploaded PDF file.
 * @returns {Promise<TemplateStatus[]>} The updated array of all template statuses.
 */
export const setTemplateUploaded = async (formId: string, file: File): Promise<TemplateStatus[]> => {
    const filePath = `${formId}-${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
        .from(TEMPLATES_BUCKET)
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error('Error uploading template file:', uploadError);
        throw uploadError;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields().map(f => f.getName());

    const { error: updateError } = await supabase
        .from(PDF_TEMPLATES_TABLE)
        .update({
            file_name: file.name,
            storage_path: filePath,
            discovered_fields: fields,
            updated_at: new Date().toISOString(),
        })
        .eq('id', formId);

    if (updateError) {
        console.error('Error updating template record:', updateError);
        await supabase.storage.from(TEMPLATES_BUCKET).remove([filePath]);
        throw updateError;
    }

    return getTemplateStatuses();
};

/**
 * Gets discovered fields for a form from Supabase.
 * @param {string} formId The ID of the form.
 * @returns {Promise<string[]>} An array of PDF field names.
 */
export const getDiscoveredFields = async (formId: string): Promise<string[]> => {
    const { data, error } = await supabase
        .from(PDF_TEMPLATES_TABLE)
        .select('discovered_fields')
        .eq('id', formId)
        .single();

    if (error) {
        console.error(`Error fetching discovered fields for ${formId}:`, error);
        return [];
    }
    return (data?.discovered_fields as string[]) || [];
};

/**
 * Retrieves a PDF template file from Supabase Storage as a base64 string.
 * @param {string} formId The ID of the form.
 * @returns {Promise<string | null>} The base64 string of the PDF, or null if not found.
 */
export const getTemplateFile = async (formId: string): Promise<string | null> => {
    const { data: templateData, error: dbError } = await supabase
        .from(PDF_TEMPLATES_TABLE)
        .select('storage_path')
        .eq('id', formId)
        .single();

    if (dbError || !templateData?.storage_path) {
        console.error(`Template record or path not found for ${formId}:`, dbError);
        return null;
    }

    const { data: fileBlob, error: storageError } = await supabase.storage
        .from(TEMPLATES_BUCKET)
        .download(templateData.storage_path);

    if (storageError || !fileBlob) {
        console.error(`Error downloading template file from storage for ${formId}:`, storageError);
        return null;
    }

    return blobToBase64(fileBlob);
};

/**
 * Gets saved field mappings for a form from Supabase.
 * @param {string} formId The ID of the form.
 * @returns {Promise<FieldMapping>} The mapping object.
 */
export const getMappingsForForm = async (formId: string): Promise<FieldMapping> => {
    const { data, error } = await supabase
        .from(PDF_TEMPLATES_TABLE)
        .select('mappings')
        .eq('id', formId)
        .single();
    
    if (error) {
        console.error(`Error fetching mappings for ${formId}:`, error);
        return {};
    }
    return (data?.mappings as FieldMapping) || {};
};

/**
 * Saves field mappings for a form to Supabase.
 * @param {string} formId The ID of the form.
 * @param {FieldMapping} mappings The mapping object to save.
 */
export const saveMappingsForForm = async (formId: string, mappings: FieldMapping): Promise<void> => {
    const { error } = await supabase
        .from(PDF_TEMPLATES_TABLE)
        .update({ mappings, updated_at: new Date().toISOString() })
        .eq('id', formId);
    
    if (error) {
        console.error(`Error saving mappings for ${formId}:`, error);
        throw error;
    }
};
