import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Breadcrumb from '../Breadcrumb';

// Mock Next.js Link — in the admin project (no full Next.js test setup)
jest.mock('next/link', () => {
  const MockLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
  MockLink.displayName = 'Link';
  return MockLink;
});

const items = [
  { label: 'Home', href: '/' },
  { label: 'Contracts', href: '/contracts' },
  { label: 'Details' },
];

describe('Breadcrumb', () => {
  it('renders all items', () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Contracts')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('renders as a nav with aria-label', () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
  });

  it('renders links for all but the last item', () => {
    render(<Breadcrumb items={items} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/');
    expect(links[1]).toHaveAttribute('href', '/contracts');
  });

  it('last item is not a link', () => {
    render(<Breadcrumb items={items} />);
    const links = screen.queryAllByRole('link');
    const texts = links.map(l => l.textContent);
    expect(texts).not.toContain('Details');
  });

  it('marks last item with aria-current="page"', () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getByText('Details')).toHaveAttribute('aria-current', 'page');
  });

  it('renders separator between items', () => {
    render(<Breadcrumb items={items} />);
    // Two separators for three items
    const separators = screen.getAllByText('/');
    expect(separators).toHaveLength(2);
  });

  it('supports custom separator', () => {
    render(<Breadcrumb items={items} separator=">" />);
    const separators = screen.getAllByText('>');
    expect(separators).toHaveLength(2);
  });

  it('renders single item without separator', () => {
    render(<Breadcrumb items={[{ label: 'Home' }]} />);
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });

  it('item without href is non-link text', () => {
    render(<Breadcrumb items={[{ label: 'Static', href: undefined }]} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Static')).toBeInTheDocument();
  });

  it('applies custom className to nav', () => {
    const { container } = render(<Breadcrumb items={items} className="my-class" />);
    expect(container.querySelector('nav')).toHaveClass('my-class');
  });
});
