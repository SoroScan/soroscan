import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DataQualityPage from '@/app/admin/data-quality/page';
import DedupConfigPage from '@/app/admin/dedup/page';
import CDCMonitoringPage from '@/app/admin/cdc/page';
import ContractsImportPage from '@/app/admin/contracts-import/page';
import { DataQualityScorecard } from '@/components/data-quality/DataQualityScorecard';
import { ReconciliationHistory } from '@/components/data-quality/ReconciliationHistory';
import { TableLevelMetrics } from '@/components/cdc-monitoring/TableLevelMetrics';
import { CDCSyncDashboard } from '@/components/cdc-monitoring/CDCSyncDashboard';
import { SyncLogViewer } from '@/components/cdc-monitoring/SyncLogViewer';

describe('Admin Tables Empty States (Issue #1710)', () => {
  describe('Data Quality Tables & Scorecards', () => {
    it('renders context-specific EmptyState when DataQualityScorecard has no metrics', () => {
      render(<DataQualityScorecard metrics={[]} />);
      const emptyState = screen.getByTestId('scorecard-empty');
      expect(emptyState).toBeInTheDocument();
      expect(screen.getByText('NO_QUALITY_METRICS')).toBeInTheDocument();
      expect(
        screen.getByText(/No contract quality data available/i)
      ).toBeInTheDocument();
    });

    it('renders context-specific EmptyState when ReconciliationHistory has no jobs', () => {
      render(<ReconciliationHistory jobs={[]} />);
      const emptyState = screen.getByTestId('reconciliation-history-empty');
      expect(emptyState).toBeInTheDocument();
      expect(screen.getByText('NO_RECONCILIATION_JOBS')).toBeInTheDocument();
      expect(
        screen.getByText(/No reconciliation jobs found/i)
      ).toBeInTheDocument();
    });

    it('renders contract selection empty guidance when no contract is selected in DataQualityPage', async () => {
      render(<DataQualityPage />);
      await waitFor(() => {
        expect(screen.queryByTestId('scorecard-loading')).not.toBeInTheDocument();
      });
      expect(
        screen.getByTestId('data-quality-detail-empty')
      ).toBeInTheDocument();
      expect(screen.getByText('NO_CONTRACT_SELECTED')).toBeInTheDocument();
      expect(
        screen.getByText(/Select a contract from the completeness scorecard/i)
      ).toBeInTheDocument();
    });
  });

  describe('Dedup Configuration & Testing Tables', () => {
    it('renders empty test results placeholder before running a test', () => {
      render(<DedupConfigPage />);
      expect(screen.getByTestId('dedup-test-empty')).toBeInTheDocument();
      expect(screen.getByText('NO_TEST_RESULTS')).toBeInTheDocument();
      expect(
        screen.getByText(/No fingerprint test executed yet/i)
      ).toBeInTheDocument();
    });

    it('renders empty fields warning when all suggested fields are deselected', () => {
      render(<DedupConfigPage />);
      // Default selected are ['event_type', 'tx_hash']
      const eventTypeBtn = screen.getByRole('button', { name: 'event_type' });
      const txHashBtn = screen.getByRole('button', { name: 'tx_hash' });

      fireEvent.click(eventTypeBtn);
      fireEvent.click(txHashBtn);

      expect(screen.getByTestId('dedup-fields-empty')).toBeInTheDocument();
      expect(screen.getByText('NO_FIELDS_SELECTED')).toBeInTheDocument();
      expect(
        screen.getByText(/No uniqueness fields currently selected/i)
      ).toBeInTheDocument();
    });
  });

  describe('CDC Monitoring Tables & Sync Dashboards', () => {
    it('renders context-specific EmptyState when CDCSyncDashboard has no active syncs', () => {
      render(<CDCSyncDashboard syncs={[]} />);
      const emptyDashboard = screen.getByTestId('dashboard-empty');
      expect(emptyDashboard).toBeInTheDocument();
      expect(screen.getByText('NO_CDC_SYNCS')).toBeInTheDocument();
      expect(
        screen.getByText(/No active CDC syncs configured/i)
      ).toBeInTheDocument();
    });

    it('renders context-specific EmptyState when TableLevelMetrics has no rows', () => {
      render(<TableLevelMetrics metrics={[]} />);
      const emptyTable = screen.getByTestId('table-metrics-empty');
      expect(emptyTable).toBeInTheDocument();
      expect(screen.getByText('NO_TABLE_METRICS')).toBeInTheDocument();
      expect(
        screen.getByText(/No table metrics available for the active sync pipeline/i)
      ).toBeInTheDocument();
    });

    it('renders context-specific EmptyState when SyncLogViewer filtered results are empty', () => {
      render(<SyncLogViewer logs={[]} />);
      const emptyLogs = screen.getByTestId('log-empty');
      expect(emptyLogs).toBeInTheDocument();
      expect(screen.getByText('NO_LOG_ENTRIES')).toBeInTheDocument();
      expect(
        screen.getByText(/No log entries match the current filters/i)
      ).toBeInTheDocument();
    });

    it('renders CDCMonitoringPage with dashboard empty state on initial render', () => {
      render(<CDCMonitoringPage />);
      expect(screen.getByTestId('dashboard-empty')).toBeInTheDocument();
    });
  });

  describe('Contracts Import Tables & Reporting', () => {
    it('renders context-specific EmptyState when no import report has been generated', () => {
      render(<ContractsImportPage />);
      const emptyReport = screen.getByTestId('import-report-empty');
      expect(emptyReport).toBeInTheDocument();
      expect(screen.getByText('NO_IMPORT_RECORDS')).toBeInTheDocument();
      expect(
        screen.getByText(/No metadata import report available/i)
      ).toBeInTheDocument();
    });
  });
});
