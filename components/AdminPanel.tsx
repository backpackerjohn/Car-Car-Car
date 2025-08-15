import React, { useState, useEffect } from 'react';
import { Form, TemplateStatus } from '../types';
import { ALL_FORMS } from '../constants';
import * as templateService from '../services/templateService';
import FieldMappingModal from './FieldMappingModal';

const AdminPanel: React.FC = () => {
    const [statuses, setStatuses] = useState<TemplateStatus[]>([]);
    const [selectedForm, setSelectedForm] = useState<Form | null>(null);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadStatuses = async () => {
            try {
                setError(null);
                const fetchedStatuses = await templateService.getTemplateStatuses();
                setStatuses(fetchedStatuses);
            } catch (e) {
                console.error("Failed to load template statuses", e);
                setError("Could not load template data from the database.");
            }
        };
        loadStatuses();
    }, []);

    const handleFileUpload = async (formId: string, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsProcessing(formId);
            setError(null);
            try {
                const updatedStatuses = await templateService.setTemplateUploaded(formId, file);
                setStatuses(updatedStatuses);
            } catch (error) {
                console.error("Failed to process uploaded PDF:", error);
                setError("Error processing PDF. Please ensure it's a valid, unencrypted PDF with form fields.");
            } finally {
                setIsProcessing(null);
            }
        }
    };

    const handleSaveMappings = () => {
        // Mappings are saved within the modal, this just closes it
        setSelectedForm(null); 
    };

    return (
        <div className="p-6 bg-gray-50 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">PDF Template Management</h2>
            <p className="text-sm text-gray-500 mb-6">Upload the 9 dealership PDF templates and map their fields to customer data. This is a one-time setup.</p>
            
            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                </div>
            )}

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <ul className="divide-y divide-gray-200">
                    {ALL_FORMS.map(form => {
                        const status = statuses.find(s => s.formId === form.id);
                        const isFormProcessing = isProcessing === form.id;
                        return (
                            <li key={form.id} className="py-4 flex items-center justify-between">
                                <div>
                                    <p className="text-md font-medium text-gray-900">{form.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {status?.uploaded ? `File: ${status.fileName}` : 'Template not yet uploaded.'}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    {status?.uploaded && (
                                        <button 
                                            onClick={() => setSelectedForm(form)}
                                            className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                                            Map Fields
                                        </button>
                                    )}
                                    <label className={`cursor-pointer px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 ${isFormProcessing ? 'cursor-not-allowed opacity-50' : ''}`}>
                                        {isFormProcessing ? 'Processing...' : (status?.uploaded ? 'Replace' : 'Upload')}
                                        <input type="file" className="hidden" accept=".pdf" onChange={(e) => handleFileUpload(form.id, e)} disabled={isFormProcessing} />
                                    </label>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
             {selectedForm && (
                <FieldMappingModal
                    form={selectedForm}
                    onClose={() => setSelectedForm(null)}
                    onSave={handleSaveMappings}
                />
            )}
        </div>
    );
};

export default AdminPanel;
