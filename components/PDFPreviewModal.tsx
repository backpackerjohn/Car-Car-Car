import React, { useState, useEffect } from 'react';
import { Form, CustomerProfile } from '../types';
import * as pdfService from '../services/pdfGenerationService';
import { getFormReadiness } from '../services/formService';
import JSZip from 'jszip';

interface PDFPreviewModalProps {
    forms: Form[];
    customer: CustomerProfile;
    onClose: () => void;
}

type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';
type PreviewData = { [formId: string]: { filledFields: pdfService.FilledField[], readiness: ReturnType<typeof getFormReadiness> } };


const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({ forms, customer, onClose }) => {
    const [activeTab, setActiveTab] = useState(forms[0]?.id || '');
    const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
    const [generationMessage, setGenerationMessage] = useState('');
    
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);

    useEffect(() => {
        const loadPreviewData = async () => {
            setIsLoadingPreview(true);
            const data: PreviewData = {};
            for (const form of forms) {
                const filledFields = await pdfService.generatePreviewData(form.id, customer);
                const readiness = getFormReadiness(form.id, customer);
                data[form.id] = { filledFields, readiness };
            }
            setPreviewData(data);
            setIsLoadingPreview(false);
        };

        if (forms.length > 0) {
            loadPreviewData();
        } else {
            setIsLoadingPreview(false);
        }
    }, [forms, customer]);

    const activeFormData = previewData ? previewData[activeTab] : null;

    const handleGenerate = async () => {
        setGenerationStatus('generating');
        setGenerationMessage('Initializing...');

        try {
            const zip = new JSZip();
            for (let i = 0; i < forms.length; i++) {
                const form = forms[i];
                setGenerationMessage(`Generating ${i + 1}/${forms.length}: ${form.name}...`);
                const pdfBytes = await pdfService.generatePdfBytes(form, customer);
                zip.file(`${form.name.replace(/\s/g, '_')}.pdf`, pdfBytes);
            }

            setGenerationMessage('Creating ZIP file...');
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            const customerName = customer.personal_info.full_name.replace(/\s/g, '_') || 'Customer';
            link.download = `${customerName}_Deal_Documents.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            setGenerationStatus('success');
            setGenerationMessage('✓ Generation Complete!');
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error) {
            console.error("PDF Generation failed:", error);
            setGenerationStatus('error');
            setGenerationMessage(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
        }
    };

    const getButtonContent = () => {
        switch (generationStatus) {
            case 'generating':
                return (
                    <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{generationMessage}</span>
                    </div>
                );
            case 'success': return `✓ Generation Complete`;
            case 'error': return `✖ Generation Failed`;
            case 'idle': default: return `Generate & Download All (${forms.length})`;
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-preview-title"
        >
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col">
                <header className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h2 id="pdf-preview-title" className="text-xl font-bold text-gray-800">Generate & Preview Documents</h2>
                        <p className="text-sm text-gray-500">Review the auto-filled data for each form before final generation.</p>
                    </div>
                     <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200" disabled={generationStatus === 'generating'} aria-label="Close preview">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    <aside className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
                        <nav className="p-2 space-y-1" role="tablist" aria-orientation="vertical">
                            {previewData && forms.map(form => (
                                <button
                                    key={form.id}
                                    onClick={() => setActiveTab(form.id)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center justify-between ${
                                        activeTab === form.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                    role="tab"
                                    aria-selected={activeTab === form.id}
                                    aria-controls={`tab-panel-${form.id}`}
                                >
                                    <span>{form.name}</span>
                                    {previewData[form.id].readiness.isReady ? (
                                        <span aria-hidden="true" className="text-green-500">✔</span>
                                    ) : (
                                        <span aria-hidden="true" className="text-yellow-500">⚠</span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    <main className="flex-1 flex flex-col overflow-hidden" role="tabpanel" id={`tab-panel-${activeTab}`} aria-labelledby={`tab-button-${activeTab}`}>
                        {isLoadingPreview ? (
                             <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
                        ) : activeFormData ? (
                            <>
                                <div className="p-4 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold">{forms.find(f => f.id === activeTab)?.name}</h3>
                                    {!activeFormData.readiness.isReady && (
                                        <div className="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-xs" role="alert">
                                            <strong>Warning:</strong> Missing required information: {activeFormData.readiness.warnings.join(', ')}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 p-4 overflow-y-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">PDF Field</th>
                                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/3">Filled Value</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {activeFormData.filledFields.map(field => (
                                                <tr key={field.pdfField}>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">{field.pdfField}</td>
                                                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${field.value === '---' ? 'text-gray-400' : 'text-gray-700'}`}>{field.value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                             <div className="p-6 text-center text-gray-500">Select a form to preview.</div>
                        )}
                    </main>
                </div>

                <footer className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                     {generationStatus === 'error' && (
                        <p className="text-sm text-red-600 mr-auto flex items-center">{generationMessage}</p>
                     )}
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        disabled={generationStatus === 'generating'}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleGenerate}
                        disabled={generationStatus !== 'idle'}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-300 ${
                            generationStatus === 'success' ? 'bg-green-500' : 
                            generationStatus === 'error' ? 'bg-red-600' : 
                            'bg-blue-600 hover:bg-blue-700'
                        } disabled:bg-gray-400 disabled:cursor-wait`}
                        style={{minWidth: '220px'}}
                        aria-live="polite"
                    >
                        {getButtonContent()}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default PDFPreviewModal;
