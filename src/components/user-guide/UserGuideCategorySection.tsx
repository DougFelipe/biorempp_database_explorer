import type { View } from '@/app/routes';
import type { UserGuideCategorySection as UserGuideCategorySectionType } from '@/types/userGuide';
import { Badge, Button, Card, CardContent, SectionHeader } from '@/shared/ui';

interface UserGuideCategorySectionProps {
  category: UserGuideCategorySectionType;
  onNavigateToView: (view: View) => void;
}

function BulletGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-soft">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function UserGuideCategorySection({ category, onNavigateToView }: UserGuideCategorySectionProps) {
  return (
    <Card id={category.id} className="scroll-mt-6">
      <CardContent className="space-y-6 px-6 py-6">
        <SectionHeader
          eyebrow={category.eyebrow}
          title={category.label}
          description={category.summary}
          action={
            <Button variant="subtle" onClick={() => onNavigateToView(category.target_view)}>
              {category.cta_label}
            </Button>
          }
        />

        <div className="surface-muted space-y-4 px-5 py-5">
          <Badge variant="outline">Purpose</Badge>
          <p className="text-sm leading-6 text-slate-600">{category.purpose}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <BulletGroup title="Capabilities" items={category.capabilities} />
          <BulletGroup title="Available Filters" items={category.filters} />
          <BulletGroup title="Outputs and Tables" items={category.outputs} />
          <BulletGroup title="Detail Views and Follow-up Inspection" items={category.detail_views} />
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5">
          <p className="text-sm font-semibold text-emerald-950">Best used for</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-emerald-900">
            {category.best_for.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
