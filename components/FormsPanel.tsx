import React, { useMemo } from 'react';
import { CustomerProfile } from '../types';
import { determineStage, getRequiredForms, getFormReadiness } from '../services/formService';

interface FormsPanelProps {
  customer: CustomerProfile;
  onGenerateClick: () => void;
}

const FormItem: React.FC<{ name: string, reason: string, isReady: boolean, warnings: string[] }> = ({ name, reason, isReady, warnings }) => (
    <li className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center">
            <div>
                <span className="text-sm font-medium text-gray-800">{name}</span>
                <span className="text-xs text-gray-500 ml-2 capitalize">({reason})</span>
            </div>
            {isReady ? (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 011-1h.008a1 1 0 011 1v3.008a1 1 0 01-1 1H9a1 1 0 01-1-1V5z" clipRule="evenodd" />
                </svg>
            )}
        </div>
        {!isReady && warnings.length > 0 && (
            <div className="mt-2 pl-2 border-l-2 border-yellow-400">
                <p className="text-xs font-semibold text-yellow-700">Missing Information:</p>
                <ul className="list-disc list-inside">
                    {warnings.map((warning, index) => (
                        <li key={index} className="text-xs text-gray-600">{warning}</li>
                    ))}
                </ul>
            </div>
        )}
    </li>
);


const FormsPanel: React.FC<FormsPanelProps> = ({ customer, onGenerateClick }) => {
    const stage = useMemo(() => determineStage(customer), [customer]);
    
    const requiredFormsWithStatus = useMemo(() => {
        return getRequiredForms(customer).map(({ form, reason }) => {
            const readiness = getFormReadiness(form.id, customer);
            return {
                id: form.id,
                name: form.name,
                reason,
                ...readiness,
            };
        });
    }, [customer]);

  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Forms & Documents</h2>
      <p className="text-sm text-gray-500 mb-4">Current Stage: <span className="font-semibold capitalize text-blue-600">{stage.replace('_', ' ')}</span></p>

        {requiredFormsWithStatus.length > 0 ? (
            <div className="space-y-3">
                <ul className="space-y-2">
                    {requiredFormsWithStatus.map(form => (
                        <FormItem 
                            key={form.id}
                            name={form.name}
                            reason={form.reason}
                            isReady={form.isReady}
                            warnings={form.warnings}
                        />
                    ))}
                </ul>
                 <button 
                    onClick={onGenerateClick}
                    disabled={requiredFormsWithStatus.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed">
                    Generate & Preview PDFs ({requiredFormsWithStatus.length})
                </button>
            </div>
        ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm font-medium text-gray-600">No forms required at this stage.</p>
                <p className="text-xs text-gray-500">Continue the conversation to gather more information.</p>
            </div>
        )}
    </div>
  );
};

export default FormsPanel;
