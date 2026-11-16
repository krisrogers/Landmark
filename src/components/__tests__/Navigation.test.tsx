import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { Navigation } from '../Navigation';

describe('Navigation', () => {
  it('renders navigation items', () => {
    render(<Navigation />);

    expect(screen.getByText('Map')).toBeInTheDocument();
    expect(screen.getByText('Places')).toBeInTheDocument();
    expect(screen.getByText('Due')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    // Things (assets) stays hidden for now
    expect(screen.queryByText('Things')).not.toBeInTheDocument();
  });

  it('renders correct number of nav links', () => {
    render(<Navigation />);

    const navLinks = screen.getAllByRole('link');
    expect(navLinks).toHaveLength(4);
  });

  it('has correct paths for navigation links', () => {
    render(<Navigation />);

    expect(screen.getByRole('link', { name: /map/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /places/i })).toHaveAttribute('href', '/places');
    expect(screen.getByRole('link', { name: /due/i })).toHaveAttribute('href', '/due');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  });
});
