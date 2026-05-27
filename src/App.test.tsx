import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '#/';
});

describe('App routes', () => {
  it('redirects the removed settings route to leagues', async () => {
    window.location.hash = '#/settings';

    render(<App />);

    await waitFor(() => expect(window.location.hash).toBe('#/'));
    expect(screen.getByRole('heading', { name: 'Leagues' })).toBeInTheDocument();
  });
});
