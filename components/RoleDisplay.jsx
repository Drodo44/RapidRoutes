// components/RoleDisplay.jsx - Show user role with appropriate styling
import React from 'react';

const RoleDisplay = ({ role, className = '' }) => {
  const getRoleConfig = (role) => {
    switch (role) {
      case 'Admin':
        return {
          icon: '👑',
          label: 'Administrator',
          color: 'text-yellow-400 bg-yellow-900/20 border-yellow-800',
          description: 'Full system access'
        };
      case 'Broker':
        return {
          icon: '💼',
          label: 'Broker',
          color: 'text-blue-400 bg-blue-900/20 border-blue-800',
          description: 'Licensed freight broker'
        };
      case 'Support':
        return {
          icon: '🛠️',
          label: 'Support',
          color: 'text-green-400 bg-green-900/20 border-green-800',
          description: 'Support staff'
        };
      case 'Apprentice':
        return {
          icon: '📚',
          label: 'Apprentice',
          color: 'text-gray-400 bg-gray-900/20 border-gray-700',
          description: 'Trainee/Learning'
        };
      default:
        return {
          icon: '❓',
          label: 'Unknown',
          color: 'text-red-400 bg-red-900/20 border-red-800',
          description: 'Invalid role'
        };
    }
  };

  const config = getRoleConfig(role);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${config.color} ${className}`}>
      <span className="text-lg">{config.icon}</span>
      <div className="flex flex-col">
        <span className="font-medium text-sm">{config.label}</span>
        <span className="text-xs opacity-75">{config.description}</span>
      </div>
    </div>
  );
};

export default RoleDisplay;
