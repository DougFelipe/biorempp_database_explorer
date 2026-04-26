import type { View } from '@/app/routes';
import { USER_GUIDE_CATALOG } from '@/config/userGuideCatalog';
import { Badge, Card, CardContent, SectionHeader } from '@/shared/ui';
import { UserGuideCategorySection } from '@/components/user-guide/UserGuideCategorySection';
import { UserGuideQuickNav } from '@/components/user-guide/UserGuideQuickNav';
import { UserGuideWorkflowSection } from '@/components/user-guide/UserGuideWorkflowSection';

interface UserGuidePageProps {
  onNavigateToView: (view: View) => void;
}

function renderParagraphs(items: string[]) {
  return items.map((paragraph) => (
    <p key={paragraph} className="text-sm leading-6 text-slate-600">
      {paragraph}
    </p>
  ));
}

export function UserGuidePage({ onNavigateToView }: UserGuidePageProps) {
  const guide = USER_GUIDE_CATALOG;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 px-6 py-6">
          <SectionHeader
            eyebrow="Documentation"
            title={guide.page_title}
            description={guide.page_subtitle}
            action={<Badge variant="subtle">Open Access</Badge>}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
            <div className="surface-muted space-y-3 px-5 py-5">
              {renderParagraphs(guide.intro_paragraphs)}
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5">
              <p className="text-sm font-semibold text-emerald-950">Access conditions</p>
              <p className="mt-3 text-sm leading-6 text-emerald-900">{guide.access_note}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <UserGuideWorkflowSection title={guide.workflow.title} steps={guide.workflow.steps} />

      <UserGuideQuickNav
        title={guide.quick_nav.title}
        description={guide.quick_nav.description}
        categories={guide.categories}
      />

      {guide.categories.map((category) => (
        <UserGuideCategorySection
          key={category.id}
          category={category}
          onNavigateToView={onNavigateToView}
        />
      ))}

      <Card>
        <CardContent className="space-y-4 px-6 py-6">
          <SectionHeader eyebrow="Interpretation" title="Working across modules" />
          <div className="surface-muted px-5 py-5">
            <p className="text-sm leading-6 text-slate-600">{guide.closing_note}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
