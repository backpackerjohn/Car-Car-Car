import React from 'react';
import { SALESPERSON_NAME } from '../constants';

interface HeaderProps {
  onAdminClick: () => void;
  onToggleCustomers: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAdminClick, onToggleCustomers }) => {
  return (
    <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10 border-b border-gray-200">
      <div className="flex items-center">
        <button 
          onClick={onToggleCustomers} 
          className="md:hidden mr-4 p-1 text-gray-600 hover:text-gray-900"
          aria-label="Toggle customer list"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Dealership AI Auto-Fill</h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-600 hidden sm:block">
          Salesperson: <span className="font-semibold text-gray-900">{SALESPERSON_NAME}</span>
        </div>
        <button 
          onClick={onAdminClick}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Admin
        </button>
      </div>
    </header>
  );
};

export default Header;
