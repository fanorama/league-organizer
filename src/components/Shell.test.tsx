import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Shell } from './Shell';

describe('Shell', () => {
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
