import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../../App';
import { FAQ_CATALOG } from '../../../config/faqCatalog';

describe('App shell navigation', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('renders the home route and navigates to FAQ and Database Metrics', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'FAQ' }));
    expect(screen.getByRole('heading', { name: FAQ_CATALOG.title })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/faq');

    await user.click(screen.getByRole('button', { name: 'Database Metrics' }));
    expect(screen.getByRole('heading', { name: 'Database Metrics' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/database-metrics');
  });

  it('honors the current route on initial render', () => {
    window.history.replaceState({}, '', '/database-metrics');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Database Metrics' })).toBeInTheDocument();
  });
});
