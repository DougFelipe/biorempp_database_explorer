import { useState } from 'react';
import type { GuidedUseCaseDescription } from '../../types/guided';
import type { ReactNode } from 'react';

interface UseCaseDescriptionAccordionProps {
  content: GuidedUseCaseDescription;
  headerAction?: ReactNode;
}

export function UseCaseDescriptionAccordion({ content, headerAction }: UseCaseDescriptionAccordionProps) {
  const [open, setOpen] = useState(false);
  const hasVisualElements = Array.isArray(content.visual_elements) && content.visual_elements.length > 0;

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex items-center justify-between text-left lg:min-w-0 lg:flex-1"
        >
          <h4 className="text-base font-semibold text-gray-900">View Use Case Description</h4>
          <span className="text-sm text-gray-500 ml-4">{open ? 'Hide' : 'Show'}</span>
        </button>
        {headerAction ? <div className="lg:shrink-0">{headerAction}</div> : null}
      </div>

      {open ? (
        <div className="px-6 pb-5 border-t border-gray-200 space-y-5">
          <div className="pt-4">
            <h5 className="text-sm font-semibold text-gray-900">Scientific Question</h5>
            <p className="text-sm text-gray-700 mt-1">{content.scientific_question}</p>
          </div>

          <div>
            <h5 className="text-sm font-semibold text-gray-900">Description</h5>
            <p className="text-sm text-gray-700 mt-1">{content.description}</p>
          </div>

          {hasVisualElements ? (
            <div>
              <h5 className="text-sm font-semibold text-gray-900">Visual Elements</h5>
              <ul className="mt-2 space-y-2 text-sm text-gray-700 list-disc pl-5">
                {content.visual_elements?.map((item, idx) => (
                  <li key={`${item.title}-${idx}`}>
                    <span className="font-medium text-gray-900">{item.title}:</span> {item.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <h5 className="text-sm font-semibold text-gray-900">Interpretation</h5>
            <ul className="mt-2 space-y-2 text-sm text-gray-700 list-disc pl-5">
              {content.interpretation.map((statement, idx) => (
                <li key={`interpretation-${idx}`}>{statement}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
