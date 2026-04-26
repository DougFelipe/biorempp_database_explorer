import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HOME_EDITORIAL_CATALOG } from '../../../config/homeCatalog';
import { DOWNLOAD_CATALOG } from '../../../config/downloadCatalog';
import { HomePage } from '../../../components/HomePage';

describe('HomePage', () => {
  it('opens the download disclaimer dialog with the selected release', async () => {
    const user = userEvent.setup();
    const targetDownload = DOWNLOAD_CATALOG.items[0];

    render(<HomePage onNavigateToView={vi.fn()} />);

    await user.click(
      screen.getAllByRole('button', { name: HOME_EDITORIAL_CATALOG.downloads.disclaimer_title })[0]
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(targetDownload.format);
    expect(dialog).toHaveTextContent(targetDownload.version);
    expect(
      screen.getByRole('link', { name: HOME_EDITORIAL_CATALOG.downloads.open_release_label })
    ).toHaveAttribute('href', targetDownload.url);
  });

  it('renders the YAML-driven editorial sections and reveals secondary downloads through the accordion', async () => {
    const user = userEvent.setup();

    render(<HomePage onNavigateToView={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: HOME_EDITORIAL_CATALOG.hero.title })
    ).toBeInTheDocument();
    expect(screen.getByText(HOME_EDITORIAL_CATALOG.hero.access_statement)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: HOME_EDITORIAL_CATALOG.scientific_overview.title })
    ).toBeInTheDocument();
    expect(screen.getByText(HOME_EDITORIAL_CATALOG.data_sources.title)).toBeInTheDocument();
    expect(screen.getByText(HOME_EDITORIAL_CATALOG.data_sources.items[0])).toBeInTheDocument();
    expect(screen.getByText(HOME_EDITORIAL_CATALOG.target_users.title)).toBeInTheDocument();
    expect(screen.getByText(HOME_EDITORIAL_CATALOG.target_users.items[0])).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: HOME_EDITORIAL_CATALOG.limitations.title })
    ).toBeInTheDocument();

    const browseHeading = screen.getByRole('heading', {
      name: HOME_EDITORIAL_CATALOG.browse_section.title,
    });
    const snapshotHeading = screen.getByRole('heading', {
      name: new RegExp(HOME_EDITORIAL_CATALOG.snapshot.title, 'i'),
    });
    expect(
      browseHeading.compareDocumentPosition(snapshotHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    expect(screen.getByText(HOME_EDITORIAL_CATALOG.browse_section.items[0].label)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: HOME_EDITORIAL_CATALOG.guided_analysis.title })
    ).toBeInTheDocument();
    expect(screen.queryByText(DOWNLOAD_CATALOG.items[1].label)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: new RegExp(HOME_EDITORIAL_CATALOG.downloads.accordion_title, 'i') })
    );

    expect(screen.getByText(DOWNLOAD_CATALOG.items[1].label)).toBeInTheDocument();
    expect(screen.getByText(DOWNLOAD_CATALOG.items[2].label)).toBeInTheDocument();
  });
});
