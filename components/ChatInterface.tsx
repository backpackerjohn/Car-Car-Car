import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onImageUpload: (file: File) => void;
  isAiThinking: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, onImageUpload, isAiThinking }) => {
  const [inputText, setInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageUpload(event.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
      <div className="flex-1 p-4 overflow-y-auto" role="log" aria-live="polite">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-end mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-4 py-2 rounded-lg max-w-lg ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
         {isAiThinking && (
            <div className="flex items-end mb-4 justify-start">
                <div className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 rounded-bl-none flex items-center" aria-label="AI is thinking">
                    <span className="mr-2">AI is thinking</span>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/png, image/jpeg"
            aria-hidden="true"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-blue-500 rounded-full hover:bg-gray-100 transition"
            title="Upload Driver's License"
            aria-label="Upload Driver's License"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type customer information..."
            className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isAiThinking}
            aria-label="Chat input"
          />
          <button
            onClick={handleSendMessage}
            disabled={isAiThinking}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
