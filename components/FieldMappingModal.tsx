import React, { useState, useEffect, useMemo } from 'react';
import { Form, FieldMapping } from '../types';
import * as templateService from '../services/templateService';
import { getCustomerProfileFlatKeys } from '../utils';
import { MAPPABLE_SPECIAL_KEYS } from '../services/pdfGenerationService';

interface FieldMappingModalProps {
    form: Form;
    onClose: () => void;
    onSave: () => void;
}

const FieldMappingModal: React.FC<FieldMappingModalProps> = ({ form, onClose, onSave }) => {
    const [discoveredFields, setDiscoveredFields] = useState<string[]>([]);
    const [mappings, setMappings] = useState<FieldMapping>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mappableDataKeys = useMemo(() => {
        const profileKeys = getCustomerProfileFlatKeys();
        const specialKeys = MAPPABLE_SPECIAL_KEYS.map(k => ({ key: k, group: 'Special Values' }));
        const personalKeys = profileKeys.filter(k => k.startsWith('personal_info')).map(k => ({ key: k, group: 'Personal Info' }));
        const vehicleKeys = profileKeys.filter(k => k.startsWith('vehicle_info')).map(k => ({ key: k, group: 'Vehicle Info' }));
        const financialKeys = profileKeys.filter(k => k.startsWith('financial_info')).map(k => ({ key: k, group: 'Financial Info' }));
        
        return [
            { group: 'Special Values', keys: specialKeys.map(k => k.key) },
            { group: 'Personal Info', keys: personalKeys.map(k => k.key) },
            { group: 'Vehicle Info', keys: vehicleKeys.map(k => k.key) },
            { group: 'Financial Info', keys: financialKeys.map(k => k.key) },
        ];
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const fields = await templateService.getDiscoveredFields(form.id);
                const savedMappings = await templateService.getMappingsForForm(form.id);
                setDiscoveredFields(fields);
                setMappings(savedMappings);
            } catch (error) {
                console.error("Failed to load mapping data:", error);
                setError("Could not load form data. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [form.id]);

    const handleMappingChange = (pdfField: string, customerDataPath: string) => {
        setMappings(prev => ({ ...prev, [pdfField]: customerDataPath }));
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        setError(null);
        try {
            await templateService.saveMappingsForForm(form.id, mappings);
            onSave();
        } catch (error) {
            console.error("Failed to save mappings:", error);
            setError("Failed to save mappings. Please check your connection and try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mapping-modal-title"
        >
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col">
                <header className="p-4 border-b border-gray-200">
                    <h2 id="mapping-modal-title" className="text-xl font-bold text-gray-800">Field Mapping for "{form.name}"</h2>
                    <p className="text-sm text-gray-500">Match the PDF fields on the left with the corresponding customer data fields on the right.</p>
                </header>
                
                <div className="flex-1 p-6 overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center py-10">Loading fields...</div>
                    ) : error && discoveredFields.length === 0 ? (
                        <div className="text-center py-10 text-red-600">{error}</div>
                    ) : (
                        <div className="space-y-4">
                            {discoveredFields.length === 0 ? (
                                <p className="text-center text-gray-500">No fillable fields were discovered in this PDF template.</p>
                            ) : (
                                discoveredFields.map(field => (
                                    <div key={field} className="grid grid-cols-2 gap-4 items-center">
                                        <div className="text-right">
                                            <label htmlFor={`mapping-${field}`} className="text-sm font-medium text-gray-700">{field}</label>
                                        </div>
                                        <div>
                                            <select
                                                id={`mapping-${field}`}
                                                value={mappings[field] || ''}
                                                onChange={(e) => handleMappingChange(field, e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                            >
                                                <option value="">-- Not Mapped --</option>
                                                {mappableDataKeys.map(group => (
                                                    <optgroup label={group.group} key={group.group}>
                                                        {group.keys.map(key => (
                                                            <option key={key} value={key}>{key}</option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <footer className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end items-center space-x-3">
                    {error && !isLoading && <p className="text-sm text-red-600 mr-auto">{error}</p>}
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" disabled={isSaving}>
                        Cancel
                    </button>
                    <button onClick={handleSaveChanges} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Mappings'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default FieldMappingModal;