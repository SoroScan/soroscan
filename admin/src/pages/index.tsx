import React from 'react';
import AdminMetricCards from '../components/AdminMetricCards';

const AdminOverviewPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor webhook activity and delivery health.
        </p>
      </div>

      <AdminMetricCards
        activeWebhooks={0}
        failedWebhooks24h={0}
        averageDeliveryLatencyMs={0}
      />
    </div>
  );
};

export default AdminOverviewPage;
