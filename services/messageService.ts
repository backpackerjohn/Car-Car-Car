import { Message } from '../types';
import { supabase } from './customerService'; // Import the initialized client
import { MESSAGES_TABLE } from '../constants';

/**
 * Retrieves all messages for a specific customer from Supabase.
 * @param {string} customerId The ID of the customer.
 * @returns {Promise<Message[]>} An array of messages.
 */
export const getMessagesFromStorage = async (customerId: string): Promise<Message[]> => {
    if (!customerId) return [];
    
    const { data, error } = await supabase
        .from(MESSAGES_TABLE)
        .select('role, text, timestamp') // Select only the fields needed by the Message type
        .eq('customer_id', customerId)
        .order('timestamp', { ascending: true });
        
    if (error) {
        console.error(`Error fetching messages for customer ${customerId}:`, error);
        throw new Error(error.message);
    }

    // The data structure from Supabase now matches the Message type directly
    return (data as Message[]) || [];
};

/**
 * Appends a new message or messages for a specific customer to Supabase.
 * This is more efficient than deleting and re-inserting the entire chat history.
 * @param {string} customerId The ID of the customer.
 * @param {Message | Message[]} newMessages The new message or array of messages to append.
 */
export const appendMessagesToStorage = async (customerId: string, newMessages: Message | Message[]): Promise<void> => {
    if (!customerId) return;

    const messagesToInsert = (Array.isArray(newMessages) ? newMessages : [newMessages]).map(msg => ({
        customer_id: customerId,
        role: msg.role,
        text: msg.text,
        timestamp: msg.timestamp,
    }));

    if (messagesToInsert.length === 0) return;

    const { error } = await supabase
        .from(MESSAGES_TABLE)
        .insert(messagesToInsert);
        
    if (error) {
        console.error(`Error appending messages for customer ${customerId}:`, error);
        throw new Error(error.message);
    }
};
