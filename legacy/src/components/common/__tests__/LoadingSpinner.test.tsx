import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/utils';
import { LoadingSpinner, LoadingOverlay } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders an SVG spinner element', () => {
    const { container } = render(<LoadingSpinner />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has animate-spin class for animation', () => {
    const { container } = render(<LoadingSpinner />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('animate-spin');
  });

  it('renders with default medium size', () => {
    const { container } = render(<LoadingSpinner />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-8', 'h-8');
  });

  it('renders with small size when specified', () => {
    const { container } = render(<LoadingSpinner size="sm" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-4', 'h-4');
  });

  it('renders with large size when specified', () => {
    const { container } = render(<LoadingSpinner size="lg" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-12', 'h-12');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-class" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
  });

  it('has primary color styling', () => {
    const { container } = render(<LoadingSpinner />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-primary-600');
  });

  it('contains spinner visual elements (circle and path)', () => {
    const { container } = render(<LoadingSpinner />);

    const circle = container.querySelector('circle');
    const path = container.querySelector('path');

    expect(circle).toBeInTheDocument();
    expect(path).toBeInTheDocument();
  });
});

describe('LoadingOverlay', () => {
  it('renders with default loading message', () => {
    render(<LoadingOverlay />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingOverlay message="Initializing Landmark..." />);

    expect(screen.getByText('Initializing Landmark...')).toBeInTheDocument();
  });

  it('contains a large LoadingSpinner', () => {
    const { container } = render(<LoadingOverlay />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-12', 'h-12'); // lg size
  });

  it('has fixed positioning for full-screen overlay', () => {
    const { container } = render(<LoadingOverlay />);

    const overlay = container.firstChild;
    expect(overlay).toHaveClass('fixed', 'inset-0');
  });

  it('has high z-index for overlay stacking', () => {
    const { container } = render(<LoadingOverlay />);

    const overlay = container.firstChild;
    expect(overlay).toHaveClass('z-50');
  });

  it('centers content vertically and horizontally', () => {
    const { container } = render(<LoadingOverlay />);

    const overlay = container.firstChild;
    expect(overlay).toHaveClass('flex', 'items-center', 'justify-center');
  });
});
