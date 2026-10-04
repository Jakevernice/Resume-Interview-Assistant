import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PatchReviewModal from './PatchReviewModal';

vi.mock('@monaco-editor/react', () => ({
  DiffEditor: () => <div data-testid="diff-editor" />,
}));

const mockedStoreState = {
  resume_latex: '\\item A',
  surgical_patches: [
    {
      search_text: '\\item A',
      replace_with: '\\item A, B',
    },
  ],
  patch_report: {
    total_patches: 1,
    applied_patches: 0,
    failed_patches: 1,
    parse_failure: false,
    items: [
      {
        patch_index: 0,
        status: 'failed',
        reason_code: 'not_found_after_normalization',
        message: 'search_text not found after normalization.',
        search_text_preview: '\\item A',
      },
    ],
  },
  setResumeLatex: vi.fn(),
};

vi.mock('../store/useStore', () => ({
  useStore: () => mockedStoreState,
}));

describe('PatchReviewModal', () => {
  it('renders reason-coded patch report rows', () => {
    render(<PatchReviewModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/Patch Review/i)).toBeInTheDocument();
    expect(screen.getByText(/not_found_after_normalization/i)).toBeInTheDocument();
    expect(screen.getByText(/^failed$/i)).toBeInTheDocument();
    expect(screen.getByTestId('diff-editor')).toBeInTheDocument();
  });
});

