import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '#/';
});

describe('App routes', () => {
  it('renders the quick match page', async () => {
    window.location.hash = '#/quick-match';

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Quick Match' })).toBeInTheDocument();
  });

  it('redirects the removed settings route to leagues', async () => {
    window.location.hash = '#/settings';

    render(<App />);

    await waitFor(() => expect(window.location.hash).toBe('#/'));
    expect(screen.getByRole('heading', { name: 'Leagues' })).toBeInTheDocument();
  });
});
