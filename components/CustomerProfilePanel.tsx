
import React from 'react';
import { CustomerProfile } from '../types';

interface CustomerProfilePanelProps {
  customer: CustomerProfile;
  onUpdate: (data: Partial<CustomerProfile>) => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-300 pb-1 mb-2">{title}</h3>
        <div className="space-y-2">{children}</div>
    </div>
);

const InfoRow: React.FC<{ label: string; value: string | number | undefined; isExpired?: boolean }> = ({ label, value, isExpired }) => (
    <div className="grid grid-cols-3 gap-2 items-center">
        <span className="text-sm font-medium text-gray-500 col-span-1">{label}</span>
        <span className={`text-sm text-gray-800 col-span-2 ${isExpired ? 'text-red-500 font-bold' : ''}`}>{value || 'N/A'}</span>
    </div>
);

const CustomerProfilePanel: React.FC<CustomerProfilePanelProps> = ({ customer, onUpdate }) => {
  if (!customer) return null;
  
  // NOTE: A full implementation would use controlled inputs with local state for editing.
  // For this version, we are focusing on display with the update mechanism in place.
  // Manual editing is supported by the architecture but not fully implemented in the UI fields.

  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Customer Profile</h2>
      
      <Section title="Personal Information">
        <InfoRow label="Full Name" value={customer.personal_info.full_name} />
        <InfoRow label="Phone" value={customer.personal_info.phone} />
        <InfoRow label="Email" value={customer.personal_info.email} />
        <InfoRow label="Address" value={customer.personal_info.address.full_address} />
      </Section>

      <Section title="Driver's License">
        <InfoRow label="State" value={customer.personal_info.drivers_license.state} />
        <InfoRow label="Number" value={customer.personal_info.drivers_license.number} />
        <InfoRow 
            label="Expiration" 
            value={customer.personal_info.drivers_license.expiration} 
            isExpired={customer.personal_info.drivers_license.is_expired}
        />
        {customer.personal_info.drivers_license.is_expired && <p className="text-xs text-red-600">License is expired!</p>}
      </Section>

      <Section title="Vehicle Information">
        <InfoRow label="Interested In" value={`${customer.vehicle_info.interest_vehicle.year} ${customer.vehicle_info.interest_vehicle.make} ${customer.vehicle_info.interest_vehicle.model}`.trim()} />
        <InfoRow label="Trade-In" value={customer.vehicle_info.trade_in ? `Yes - ${customer.vehicle_info.trade_vehicle.year} ${customer.vehicle_info.trade_vehicle.make} ${customer.vehicle_info.trade_vehicle.model}`.trim() : 'No'} />
        <InfoRow label="Purchase Type" value={customer.vehicle_info.purchase_type} />
      </Section>

       <Section title="Financial Information">
        <InfoRow label="Needs Financing" value={customer.financial_info.financing_needed ? 'Yes' : 'No'} />
       </Section>
    </div>
  );
};

export default CustomerProfilePanel;
