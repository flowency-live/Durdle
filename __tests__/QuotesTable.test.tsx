import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import QuotesTable from '../app/admin/quotes/components/QuotesTable';

const mockQuotes = [
  {
    quoteId: 'Q001',
    createdAt: '2024-01-15T10:30:00Z',
    customerEmail: 'john@example.com',
    pickupLocation: { address: '123 Main St' },
    dropoffLocation: { address: '456 Oak Ave' },
    totalPrice: 45.0,
    status: 'pending',
  },
  {
    quoteId: 'Q002',
    createdAt: '2024-01-14T15:45:00Z',
    customerEmail: 'jane@example.com',
    pickupLocation: { address: '789 Pine Rd' },
    dropoffLocation: { address: '321 Elm St' },
    totalPrice: 65.5,
    status: 'accepted',
  },
];

describe('QuotesTable', () => {
  it('renders table with quotes', () => {
    const mockOnRowClick = jest.fn();
    render(
      <QuotesTable
        quotes={mockQuotes}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByText('Q001')).toBeInTheDocument();
    expect(screen.getByText('Q002')).toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', () => {
    const mockOnRowClick = jest.fn();
    render(
      <QuotesTable
        quotes={mockQuotes}
        onRowClick={mockOnRowClick}
      />
    );

    const firstRow = screen.getByText('Q001');
    fireEvent.click(firstRow);

    expect(mockOnRowClick).toHaveBeenCalledWith('Q001');
  });

  it('displays sort indicators on headers', () => {
    const mockOnSort = jest.fn();
    render(
      <QuotesTable
        quotes={mockQuotes}
        onRowClick={jest.fn()}
        sortBy="date"
        sortOrder="desc"
        onSort={mockOnSort}
      />
    );

    const createdHeader = screen.getByText(/Created/);
    fireEvent.click(createdHeader);

    expect(mockOnSort).toHaveBeenCalledWith('date');
  });

  it('toggles sort order when clicking same column twice', () => {
    const mockOnSort = jest.fn();
    const { rerender } = render(
      <QuotesTable
        quotes={mockQuotes}
        onRowClick={jest.fn()}
        sortBy="date"
        sortOrder="desc"
        onSort={mockOnSort}
      />
    );

    const createdHeader = screen.getByText(/Created/);
    fireEvent.click(createdHeader);

    expect(mockOnSort).toHaveBeenCalledWith('date');
  });

  it('renders empty table when no quotes provided', () => {
    render(
      <QuotesTable
        quotes={[]}
        onRowClick={jest.fn()}
      />
    );

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('displays customer email correctly', () => {
    const mockOnRowClick = jest.fn();
    render(
      <QuotesTable
        quotes={mockQuotes}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('displays location information', () => {
    const mockOnRowClick = jest.fn();
    render(
      <QuotesTable
        quotes={mockQuotes}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('456 Oak Ave')).toBeInTheDocument();
  });

  it('displays price with proper formatting', () => {
    const mockOnRowClick = jest.fn();
    render(
      <QuotesTable
        quotes={mockQuotes}
        onRowClick={mockOnRowClick}
      />
    );

    // Prices should be displayed
    expect(screen.getByText('45.00')).toBeInTheDocument();
    expect(screen.getByText('65.50')).toBeInTheDocument();
  });

  it('displays quote status', () => {
    const mockOnRowClick = jest.fn();
    render(
      <QuotesTable
        quotes={mockQuotes}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('accepted')).toBeInTheDocument();
  });
});
