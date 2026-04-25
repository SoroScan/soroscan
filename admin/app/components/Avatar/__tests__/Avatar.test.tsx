import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  describe('Image rendering', () => {
    it('renders an img element when a valid src is provided', () => {
      render(<Avatar src="https://example.com/avatar.jpg" name="Jane Doe" />);
      const imgs = screen.getAllByRole('img', { name: 'Jane Doe' });
      const imgEl = imgs.find((el) => el.tagName === 'IMG');
      expect(imgEl).toBeInTheDocument();
      expect(imgEl).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('does not render initials when image src is provided', () => {
      render(<Avatar src="https://example.com/avatar.jpg" name="Jane Doe" />);
      expect(screen.queryByText('JD')).not.toBeInTheDocument();
    });
  });

  describe('Initials fallback', () => {
    it('renders initials when no src is provided', () => {
      render(<Avatar name="Jane Doe" />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('renders initials in uppercase', () => {
      render(<Avatar name="john smith" />);
      expect(screen.getByText('JS')).toBeInTheDocument();
    });

    it('renders single initial for a single-word name', () => {
      render(<Avatar name="Madonna" />);
      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('renders "?" for an empty name', () => {
      render(<Avatar name="" />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('renders initials when image fails to load', () => {
      render(<Avatar src="https://broken.url/img.jpg" name="Jane Doe" />);
      const imgs = screen.getAllByRole('img', { name: 'Jane Doe' });
      const imgEl = imgs.find((el) => el.tagName === 'IMG')!;
      fireEvent.error(imgEl);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  describe('Size variants', () => {
    it.each([
      ['sm', 'w-8 h-8 text-xs'],
      ['md', 'w-10 h-10 text-sm'],
      ['lg', 'w-14 h-14 text-lg'],
    ] as const)('applies correct classes for size "%s"', (size, expectedClasses) => {
      render(<Avatar name="Test User" size={size} />);
      const avatar = screen.getByRole('img', { name: 'Test User' });
      expectedClasses.split(' ').forEach((cls) => {
        expect(avatar).toHaveClass(cls);
      });
    });

    it('defaults to md size when no size prop is given', () => {
      render(<Avatar name="Test User" />);
      const avatar = screen.getByRole('img', { name: 'Test User' });
      expect(avatar).toHaveClass('w-10', 'h-10', 'text-sm');
    });
  });

  describe('Background color', () => {
    it('applies a custom color when provided', () => {
      render(<Avatar name="Test User" color="#ff0000" />);
      const avatar = screen.getByRole('img', { name: 'Test User' });
      expect(avatar).toHaveStyle({ backgroundColor: '#ff0000' });
    });

    it('applies a generated background color when no color prop is given', () => {
      render(<Avatar name="Test User" />);
      const avatar = screen.getByRole('img', { name: 'Test User' });
      expect(avatar.getAttribute('style')).toMatch(/background-color/);
    });
  });

  describe('Tooltip', () => {
    it('renders a tooltip with the user name', () => {
      render(<Avatar name="Jane Doe" />);
      expect(screen.getByRole('tooltip')).toHaveTextContent('Jane Doe');
    });

    it('tooltip is accessible via keyboard focus', () => {
      render(<Avatar name="Jane Doe" />);
      const avatar = screen.getByRole('img', { name: 'Jane Doe' });
      avatar.focus();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has aria-label equal to the name prop', () => {
      render(<Avatar name="Jane Doe" />);
      expect(screen.getByRole('img', { name: 'Jane Doe' })).toHaveAttribute('aria-label', 'Jane Doe');
    });

    it('is focusable via keyboard', () => {
      render(<Avatar name="Jane Doe" />);
      const avatar = screen.getByRole('img', { name: 'Jane Doe' });
      expect(avatar).toHaveAttribute('tabIndex', '0');
    });
  });
});
