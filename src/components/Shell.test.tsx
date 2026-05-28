import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Shell } from './Shell';

describe('Shell', () => {
  it('renders quick match navigation', () => {
    render(
      <MemoryRouter>
        <Shell active="quick-match" title="Quick Match">
          <div>Content</div>
        </Shell>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Quick Match' })).toHaveAttribute('href', '/quick-match');
  });

  it('does not render settings navigation', () => {
    render(
      <MemoryRouter>
        <Shell active="leagues" title="Leagues">
          <div>Content</div>
        </Shell>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });
});
