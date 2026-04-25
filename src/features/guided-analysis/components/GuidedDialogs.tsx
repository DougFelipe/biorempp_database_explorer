import { UseCaseDescriptionAccordion } from '@/components/guided-analysis/UseCaseDescriptionAccordion';
import { UseCaseMethodsModal } from '@/components/guided-analysis/UseCaseMethodsModal';
import { UseCaseQueryRecipesModal } from '@/components/guided-analysis/UseCaseQueryRecipesModal';
import type { GuidedQueryDefinition } from '@/features/guided-analysis/types';
import type { GuidedQueryRecipe } from '@/types/frontConfig';

interface GuidedDialogsProps {
  query: GuidedQueryDefinition;
  recipe?: GuidedQueryRecipe;
}

export function GuidedDialogs({ query, recipe }: GuidedDialogsProps) {
  return (
    <UseCaseDescriptionAccordion
      content={query.use_case_description}
      headerAction={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <UseCaseMethodsModal content={query.methods_modal} />
          {recipe ? <UseCaseQueryRecipesModal content={recipe} /> : null}
        </div>
      }
    />
  );
}
