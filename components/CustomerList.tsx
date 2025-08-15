import React, { useState, useMemo } from 'react';
import { CustomerProfile } from '../types';

interface CustomerListProps {
  customers: CustomerProfile[];
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string) => void;
  onCreateCustomer: () => void;
  isVisible: boolean;
  onClose: () => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ customers, selectedCustomerId, onSelectCustomer, onCreateCustomer, isVisible, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) {
      return customers;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return customers.filter(c =>
      c.personal_info.full_name.toLowerCase().includes(lowercasedQuery) ||
      c.personal_info.phone.includes(lowercasedQuery) ||
      c.personal_info.email.toLowerCase().includes(lowercasedQuery)
    );
  }, [customers, searchQuery]);

  const listContent = (
      <>
        {filteredCustomers.length > 0 ? (
          <ul>
            {filteredCustomers.map(customer => (
              <li key={customer.id}>
                <button
                  onClick={() => onSelectCustomer(customer.id)}
                  className={`w-full text-left p-3 hover:bg-gray-700 focus:outline-none transition-colors duration-150 ${
                    selectedCustomerId === customer.id ? 'bg-blue-600' : ''
                  }`}
                  aria-current={selectedCustomerId === customer.id ? 'page' : undefined}
                >
                  {customer.personal_info.full_name || 'New Customer'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center p-4 text-gray-400 text-sm">
            {searchQuery ? 'No customers match your search.' : 'No customers yet. Create one to begin!'}
          </div>
        )}
      </>
  );

  return (
    <>
    {/* Overlay for mobile view */}
    <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden transition-opacity ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
    ></div>

    <aside 
        className={`fixed top-0 left-0 h-full w-64 bg-gray-800 text-white flex flex-col z-30 transition-transform transform md:static md:translate-x-0 ${isVisible ? 'translate-x-0' : '-translate-x-full'}`}
        role="menu"
    >
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Customers</h2>
         <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customers..."
          className="w-full mt-2 p-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Search customers"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {listContent}
      </div>
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={onCreateCustomer}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300"
        >
          + New Customer
        </button>
      </div>
    </aside>
    </>
  );
};

export default CustomerList;
