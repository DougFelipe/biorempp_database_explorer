import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import type { GuidedMethodsModal } from '../../types/guided';

interface UseCaseMethodsModalProps {
  content: GuidedMethodsModal;
}

export function UseCaseMethodsModal({ content }: UseCaseMethodsModalProps) {
  const [open, setOpen] = useState(false);
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
              </div>
              <button
                type="button"
                aria-label="Close methods modal"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-gray-200 text-sm text-gray-500 italic">
              {content.steps.length} analytical step{content.steps.length === 1 ? '' : 's'}
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <p className="text-sm text-gray-700">{content.introduction}</p>

              {content.steps.map((step, idx) => (
                <article key={`${step.title}-${idx}`} className="rounded-lg border border-gray-200 overflow-hidden">
                  <header className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-800">
                      Step {idx + 1}: {step.title}
                    </h4>
                  </header>
                  <div className="px-4 py-4 space-y-3">
                    <p className="text-sm text-gray-700">{step.description}</p>
                    {step.bullets && step.bullets.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                        {step.bullets.map((bullet, bulletIdx) => (
                          <li key={`${step.title}-bullet-${bulletIdx}`}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </article>
              ))}

              {content.footer_note ? <p className="text-sm text-gray-600">{content.footer_note}</p> : null}
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

