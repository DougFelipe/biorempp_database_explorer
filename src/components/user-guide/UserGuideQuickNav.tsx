import type { UserGuideCategorySection } from '@/types/userGuide';
import { Button, Card, CardContent, SectionHeader } from '@/shared/ui';

interface UserGuideQuickNavProps {
  title: string;
  description: string;
  categories: UserGuideCategorySection[];
}

export function UserGuideQuickNav({ title, description, categories }: UserGuideQuickNavProps) {
  return (
    <Card>
      <CardContent className="space-y-6 px-6 py-6">
        <SectionHeader eyebrow="Navigation" title={title} description={description} />

        <nav aria-label="User guide quick navigation">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <Button
                key={category.id}
                asChild
                variant="outline"
                size="lg"
                className="h-auto w-full justify-start whitespace-normal rounded-2xl border-slate-200 px-4 py-4 text-left"
              >
                <a href={`#${category.id}`}>
                  <div className="min-w-0 max-w-full space-y-1">
                    <p className="text-sm font-semibold text-slate-950">{category.label}</p>
                    <p className="text-xs leading-5 text-slate-600 whitespace-normal break-words">{category.summary}</p>
                  </div>
                </a>
              </Button>
            ))}
          </div>
        </nav>
      </CardContent>
    </Card>
  );
}
