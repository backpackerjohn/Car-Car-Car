import React, { useEffect } from 'react';

interface ErrorNotificationProps {
    message: string | null;
    onClose: () => void;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ message, onClose }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000); // Auto-dismiss after 5 seconds
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    if (!message) {
        return null;
    }

    return (
        <div 
            className="bg-red-500 text-white px-4 py-3 shadow-md relative" 
            role="alert"
        >
            <div className="flex items-center">
                <div className="py-1">
                    <svg className="fill-current h-6 w-6 text-red-100 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M10 0a10 10 0 100 20 10 10 0 000-20zM11 15H9v-2h2v2zm0-4H9V5h2v6z"/>
                    </svg>
                </div>
                <div>
                    <span className="font-semibold">System Alert:</span>
                    <p className="text-sm">{message}</p>
                </div>
                <button 
                    onClick={onClose} 
                    className="absolute top-0 bottom-0 right-0 px-4 py-3"
                    aria-label="Close"
                >
                    <svg className="fill-current h-6 w-6 text-red-100" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <title>Close</title>
                        <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default ErrorNotification;
