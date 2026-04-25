import { useEffect, useId, useState } from 'react';
import { Clipboard, X } from 'lucide-react';
import type { GuidedQueryRecipe } from '../../types/frontConfig';

interface UseCaseQueryRecipesModalProps {
  content: GuidedQueryRecipe;
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function UseCaseQueryRecipesModal({ content }: UseCaseQueryRecipesModalProps) {
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [open]);

  useEffect(() => {
    if (!copiedKey) {
      return;
    }
    const timer = window.setTimeout(() => setCopiedKey(null), 1400);
    return () => window.clearTimeout(timer);
  }, [copiedKey]);

  async function handleCopy(key: 'sqlite' | 'python') {
    const value = key === 'sqlite' ? content.sqlite.query : content.python.script;
    try {
      await copyTextToClipboard(value);
      setCopiedKey(key);
    } catch (error) {
      console.error('Failed to copy recipe block:', error);
      setCopiedKey(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {content.button_label}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-5xl bg-white rounded-xl border border-gray-200 shadow-xl max-h-[90vh] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <h3 id={titleId} className="text-2xl font-semibold text-gray-900">
                  {content.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Reproducible static query recipes for this use case (not filter-synchronized).
                </p>
              </div>
              <button
                type="button"
                aria-label="Close query recipes modal"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-5">
              <p className="text-sm text-gray-700">{content.introduction}</p>

              <section className="rounded-lg border border-gray-200 overflow-hidden">
                <header className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">SQLite Query</h4>
                    <p className="text-sm text-gray-600 mt-0.5">{content.sqlite.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('sqlite')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Clipboard className="w-4 h-4" />
                    {copiedKey === 'sqlite' ? 'Copied' : 'Copy'}
                  </button>
                </header>
                <pre className="p-4 overflow-x-auto text-xs leading-relaxed bg-gray-950 text-gray-100">
                  <code>{content.sqlite.query}</code>
                </pre>
              </section>

              <section className="rounded-lg border border-gray-200 overflow-hidden">
                <header className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Python Script</h4>
                    <p className="text-sm text-gray-600 mt-0.5">{content.python.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('python')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Clipboard className="w-4 h-4" />
                    {copiedKey === 'python' ? 'Copied' : 'Copy'}
                  </button>
                </header>
                <pre className="p-4 overflow-x-auto text-xs leading-relaxed bg-gray-950 text-gray-100">
                  <code>{content.python.script}</code>
                </pre>
              </section>

              {content.notes && content.notes.length > 0 ? (
                <section>
                  <h4 className="text-sm font-semibold text-gray-900">Notes</h4>
                  <ul className="mt-2 space-y-1 list-disc pl-5 text-sm text-gray-700">
                    {content.notes.map((note, idx) => (
                      <li key={`recipe-note-${idx}`}>{note}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-md bg-rose-300 text-white font-medium hover:bg-rose-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
