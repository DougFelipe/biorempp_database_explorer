import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FAQ_CATALOG } from '../../../config/faqCatalog';
import { FaqPage } from '../../../components/FaqPage';

describe('FaqPage', () => {
  it('opens FAQ entries and routes CTA actions', async () => {
    const user = userEvent.setup();
    const onNavigateToView = vi.fn();
    const firstSection = FAQ_CATALOG.sections[0];
    const firstItem = firstSection.items[0];

    render(<FaqPage onNavigateToView={onNavigateToView} />);

    await user.click(screen.getByRole('button', { name: firstItem.question }));
    expect(screen.getByText(firstItem.answer)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open Guided Analysis' }));
    expect(onNavigateToView).toHaveBeenCalledWith('guided-analysis');
  });

  it('filters questions by search and shows a no-results state', async () => {
    const user = userEvent.setup();
    const targetItem = FAQ_CATALOG.sections[0].items[0];

    render(<FaqPage onNavigateToView={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Search FAQ...'), targetItem.question);
    expect(screen.getByText(targetItem.answer)).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Search FAQ...'));
    await user.type(screen.getByPlaceholderText('Search FAQ...'), 'zzzz-no-faq-match');
    expect(screen.getByText('No matching results')).toBeInTheDocument();
  });
});
