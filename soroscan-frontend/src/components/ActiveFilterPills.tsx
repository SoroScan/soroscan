import React from 'react';

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

interface ActiveFilterPillsProps {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
}

const ActiveFilterPills: React.FC<ActiveFilterPillsProps> = ({ filters, onRemove }) => {
  if (!filters || filters.length === 0) {
    return null;
  }

  return (
    <div className="active-filter-pills" role="list" aria-label="Active filters">
      {filters.map((filter) => (
        <span key={filter.key} className="active-filter-pill" role="listitem">
          <span className="active-filter-pill__label">
            {filter.label}: {filter.value}
          </span>
          <button
            type="button"
            className="active-filter-pill__remove"
            aria-label={`Remove ${filter.label} filter`}
            onClick={() => onRemove(filter.key)}
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
};

export default ActiveFilterPills;
