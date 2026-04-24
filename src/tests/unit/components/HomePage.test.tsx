import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DOWNLOAD_CATALOG } from '../../../config/downloadCatalog';
import { HomePage } from '../../../components/HomePage';

describe('HomePage', () => {
  it('opens the download disclaimer dialog with the selected release', async () => {
    const user = userEvent.setup();
    const targetDownload = DOWNLOAD_CATALOG.items[0];

    render(<HomePage onNavigateToView={vi.fn()} />);

    await user.click(screen.getAllByRole('button', { name: /review download/i })[0]);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(targetDownload.format);
    expect(dialog).toHaveTextContent(targetDownload.version);
    expect(screen.getByRole('link', { name: /open release/i })).toHaveAttribute('href', targetDownload.url);
  });
});
