import React, { useState, useEffect, useCallback } from 'react';
import { CustomerProfile, Message } from './types';
import CustomerList from './components/CustomerList';
import ChatInterface from './components/ChatInterface';
import CustomerProfilePanel from './components/CustomerProfilePanel';
import FormsPanel from './components/FormsPanel';
import Header from './components/Header';
import AdminPanel from './components/AdminPanel';
import PDFPreviewModal from './components/PDFPreviewModal';
import ErrorNotification from './components/ErrorNotification';
import { extractDataFromText, extractDataFromImage } from './services/geminiService';
import * as customerService from './services/customerService';
import { getMessagesFromStorage, appendMessagesToStorage } from './services/messageService';
import { getRequiredForms } from './services/formService';

/**
 * The main application component.
 * Manages the overall state and orchestrates the different parts of the application.
 */
function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [customers, setCustomers] = useState<CustomerProfile[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [isAdminViewVisible, setIsAdminViewVisible] = useState(false);
    const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
    const [isCustomerListVisible, setIsCustomerListVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load initial data from Supabase on component mount
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const fetchedCustomers = await customerService.getCustomersFromStorage();
                setCustomers(fetchedCustomers);
                if (fetchedCustomers.length > 0 && !selectedCustomerId) {
                    setSelectedCustomerId(fetchedCustomers[0].id);
                }
            } catch (e) {
                console.error(e);
                setError("Failed to load customer data from the database. Please check your connection and refresh.");
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    // Load messages when the selected customer changes
     useEffect(() => {
        const loadMessages = async () => {
            if (selectedCustomerId) {
                try {
                    setMessages(await getMessagesFromStorage(selectedCustomerId));
                } catch (e) {
                     console.error(e);
                     setError("Failed to load messages for the selected customer.");
                     setMessages([]);
                }
            } else {
                setMessages([]);
            }
        };
        loadMessages();
    }, [selectedCustomerId]);

    /**
     * Handles selecting a customer from the list.
     * @param id The ID of the customer to select.
     */
    const handleSelectCustomer = (id: string | null) => {
        setSelectedCustomerId(id);
        setIsAdminViewVisible(false); // Switch back to customer view
        setIsCustomerListVisible(false); // Close mobile sidebar
    };

    /**
     * Handles the creation of a new customer profile.
     */
    const handleCreateCustomer = async () => {
        setError(null);
        try {
            const newCustomer = await customerService.createNewCustomer();
            setCustomers(prev => [newCustomer, ...prev]);
            setSelectedCustomerId(newCustomer.id);
            // The useEffect for selectedCustomerId will handle loading messages.
        } catch (e) {
            console.error(e);
            setError("Failed to create a new customer in the database.");
        }
        setIsAdminViewVisible(false);
        setIsCustomerListVisible(false); // Close mobile sidebar
    };
    
    /**
     * Callback to update a customer's profile data both in state and in persistent storage.
     * @param customerId The ID of the customer to update.
     * @param data A partial CustomerProfile object with the fields to update.
     */
    const updateCustomerProfile = useCallback(async (customerId: string, data: Partial<CustomerProfile>) => {
        setError(null);
        try {
            const updatedCustomer = await customerService.updateCustomerInStorage(customerId, data);
            if (updatedCustomer) {
                setCustomers(prevCustomers => 
                    prevCustomers.map(c => c.id === customerId ? updatedCustomer : c)
                );
            }
        } catch(e) {
            console.error(e);
            setError("Failed to save customer profile update.");
        }
    }, []);
    
    /**
     * Handles sending a text message to the AI for data extraction.
     * @param text The user's message text.
     */
    const handleSendMessage = useCallback(async (text: string) => {
        if (!selectedCustomerId) return;
        
        setError(null);
        const userMessage: Message = { role: 'user', text, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMessage]); // Optimistic UI update
        
        setIsAiThinking(true);
        try {
            await appendMessagesToStorage(selectedCustomerId, userMessage);

            const currentCustomer = customers.find(c => c.id === selectedCustomerId);
            if(currentCustomer) {
                const extractedData = await extractDataFromText(text, currentCustomer);
                let systemMessage: Message;
                
                if (Object.keys(extractedData).length > 0) {
                   await updateCustomerProfile(selectedCustomerId, extractedData);
                   systemMessage = { role: 'assistant', text: "Profile updated.", timestamp: new Date().toISOString() };
                } else {
                    systemMessage = { role: 'assistant', text: "Noted. Is there anything else?", timestamp: new Date().toISOString() };
                }
                setMessages(prev => [...prev, systemMessage]);
                await appendMessagesToStorage(selectedCustomerId, systemMessage);
            }
        } catch (error) {
            console.error(error);
            setError("The AI failed to process the message. Please try rephrasing or check your connection.");
            const errorMessage: Message = { role: 'assistant', text: "Sorry, I couldn't process that. Please try again.", timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, errorMessage]);
            try {
                await appendMessagesToStorage(selectedCustomerId, errorMessage);
            } catch (dbError) {
                 console.error("Failed to save error message:", dbError);
                 setError("AI Error & Failed to save chat history. Check connection.");
            }
        } finally {
            setIsAiThinking(false);
        }
    }, [selectedCustomerId, customers, updateCustomerProfile]);

    /**
     * Handles uploading a driver's license image to the AI for OCR.
     * @param file The image file to process.
     */
    const handleImageUpload = useCallback(async (file: File) => {
        if (!selectedCustomerId) return;
        
        setError(null);
        setIsAiThinking(true);

        const uploadMessage: Message = { role: 'user', text: `Uploaded driver's license: ${file.name}`, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, uploadMessage]);
        await appendMessagesToStorage(selectedCustomerId, uploadMessage);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const processImage = async (): Promise<Message> => {
                try {
                    const base64String = (reader.result as string).split(',')[1];
                    const extractedData = await extractDataFromImage(base64String, file.type);

                    if(extractedData.number && extractedData.expiration) {
                        const expirationDate = new Date(extractedData.expiration);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0); 
                        const is_expired = expirationDate < today;
                        
                        const licenseUpdate = {
                            number: extractedData.number,
                            expiration: extractedData.expiration,
                            state: 'OH',
                            is_expired
                        };

                        await updateCustomerProfile(selectedCustomerId, { personal_info: { drivers_license: licenseUpdate } as any });
                        
                        let assistantText = `Driver's license scanned and profile updated. License #: ${licenseUpdate.number}, Expires: ${licenseUpdate.expiration}.`;
                        if (is_expired) {
                            assistantText = `⚠️ LICENSE EXPIRED: Scanned license expired on ${licenseUpdate.expiration}. Profile has been updated with a warning.`;
                        }
                        return { role: 'assistant', text: assistantText, timestamp: new Date().toISOString() };

                    } else {
                         setError("The AI could not extract data from the license image. Please try a clearer picture.");
                         return { role: 'assistant', text: "I couldn't extract the license number or expiration date from that image. Please try another photo or enter it manually.", timestamp: new Date().toISOString() };
                    }
                } catch (error) {
                     setError("A system error occurred while processing the image. Please try again later.");
                     return { role: 'assistant', text: "There was an error processing the image.", timestamp: new Date().toISOString() };
                }
            };

            const assistantMessage = await processImage();
            setMessages(prev => [...prev, assistantMessage]);
            await appendMessagesToStorage(selectedCustomerId, assistantMessage);
            setIsAiThinking(false);
        };
        reader.onerror = async () => {
            setIsAiThinking(false);
            setError("Could not read the uploaded file. It may be corrupted.");
            const errorMessage: Message = { role: 'assistant', text: "Could not read the uploaded file.", timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, errorMessage]);
            if (selectedCustomerId) {
                await appendMessagesToStorage(selectedCustomerId, errorMessage);
            }
        };

    }, [selectedCustomerId, updateCustomerProfile]);
    
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || null;
    const formsForPreview = selectedCustomer ? getRequiredForms(selectedCustomer).map(f => f.form) : [];

    if (isLoading) {
        return (
             <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-lg text-gray-600">Connecting to Database...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen font-sans bg-gray-100 text-gray-900">
            <Header 
                onAdminClick={() => setIsAdminViewVisible(prev => !prev)} 
                onToggleCustomers={() => setIsCustomerListVisible(prev => !prev)}
            />
            <ErrorNotification message={error} onClose={() => setError(null)} />
            <div className="flex flex-1 overflow-hidden">
                <CustomerList
                    customers={customers}
                    selectedCustomerId={selectedCustomerId}
                    onSelectCustomer={handleSelectCustomer}
                    onCreateCustomer={handleCreateCustomer}
                    isVisible={isCustomerListVisible}
                    onClose={() => setIsCustomerListVisible(false)}
                />
                <main className="flex-1 flex flex-col bg-white">
                    {isAdminViewVisible ? (
                        <AdminPanel />
                    ) : selectedCustomer ? (
                        <>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 p-4 overflow-hidden">
                                <div className="md:col-span-2 xl:col-span-3 flex flex-col h-full">
                                    <ChatInterface 
                                        messages={messages}
                                        onSendMessage={handleSendMessage}
                                        onImageUpload={handleImageUpload}
                                        isAiThinking={isAiThinking}
                                    />
                                </div>
                                <div className="md:col-span-1 xl:col-span-2 flex flex-col gap-4 overflow-y-auto pb-4 pr-2">
                                    <CustomerProfilePanel 
                                        customer={selectedCustomer}
                                        onUpdate={(data) => updateCustomerProfile(selectedCustomerId!, data)}
                                    />
                                    <FormsPanel 
                                        customer={selectedCustomer} 
                                        onGenerateClick={() => setIsPreviewModalVisible(true)}
                                    />
                                </div>
                            </div>
                            {isPreviewModalVisible && (
                                <PDFPreviewModal 
                                    forms={formsForPreview}
                                    customer={selectedCustomer}
                                    onClose={() => setIsPreviewModalVisible(false)}
                                />
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
                            <div className="text-center p-8">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <h3 className="mt-4 text-lg font-medium text-gray-900">Welcome!</h3>
                                <p className="mt-2 text-sm text-gray-500">Please select a customer from the list or create a new one to start a conversation.</p>
                                <div className="mt-6">
                                    <button
                                        type="button"
                                        onClick={handleCreateCustomer}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        + Create New Customer
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;