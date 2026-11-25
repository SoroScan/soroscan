import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConfirmationModal } from '../app/dashboard/components/ConfirmationModal';
import type { ComponentProps } from 'react';

type ModalProps = ComponentProps<typeof ConfirmationModal>;

function renderModal(overrides: Partial<ModalProps> = {}) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  const view = render(
    <ConfirmationModal
      title="Delete selected events"
      message="Are you sure you want to delete these events?"
      confirmLabel="Delete events"
      onConfirm={onConfirm}
      onCancel={onCancel}
      isRunning={false}
      progress={null}
      result={null}
      {...overrides}
    />,
  );
  return { ...view, onConfirm, onCancel };
}

describe('ConfirmationModal', () => {
  it('renders an accessible dialog, its title, message, buttons and extra content', () => {
    renderModal({ children: <input aria-label="Reason for deletion" /> });

    expect(screen.getByRole('dialog', { name: 'Delete selected events' })).toHaveAttribute(
      'aria-modal',
      'true',
    );
    expect(screen.getByText('Are you sure you want to delete these events?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete events' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'Reason for deletion' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('calls the confirm callback only when the confirm button is clicked', () => {
    const { onConfirm, onCancel } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Delete events' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls the cancel callback from both the footer and the close icon', () => {
    const { onConfirm, onCancel } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('closes on Escape and clicks on the backdrop, but not clicks inside the dialog', () => {
    const { onCancel } = renderModal();
    fireEvent.click(screen.getByText('Are you sure you want to delete these events?'));
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('dialog'));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('disables confirmation when confirmDisabled is set', () => {
    const { onConfirm } = renderModal({ confirmDisabled: true, confirmVariant: 'danger' });
    const button = screen.getByRole('button', { name: 'Delete events' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('prevents confirmation and dismissal while running and displays progress', () => {
    const { onConfirm, onCancel } = renderModal({
      isRunning: true,
      progress: { total: 4, completed: 2, failed: 1, percent: 50 },
    });

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText(/Processing.*2 \/ 4/)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete events' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Close modal' })).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete events' }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows successful and failed result counts after batch completion', () => {
    const { onCancel } = renderModal({
      progress: { total: 3, completed: 3, failed: 1, percent: 100 },
      result: { succeeded: ['one', 'two'], failed: ['three'] },
    });

    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText(/2 succeeded/)).toBeInTheDocument();
    expect(screen.getByText(/1 failed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close', exact: true }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('unmounts cleanly and removes the Escape listener when the parent hides it', () => {
    const { unmount, onCancel } = renderModal();
    unmount();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
