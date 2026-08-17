import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, Chip, EmptyState, Input, Spinner, Button } from "@/components/ui-kit";
import { SignGlyph } from "@/components/SignGlyph";
import { supabase } from "@/integrations/supabase/client";
import { signCategories } from "@/lib/safesteps";

export const Route = createFileRoute("/_authenticated/signs")({
  head: () => ({
    meta: [
      { title: "Indian Traffic Sign Library — SafeSteps" },
      {
        name: "description",
        content:
          "Searchable library of Indian mandatory, warning and informational traffic signs with meaning and usage.",
      },
      { property: "og:title", content: "Indian Traffic Sign Library — SafeSteps" },
      {
        property: "og:description",
        content: "Learn what every Indian traffic sign means and where it is used.",
      },
    ],
  }),
  component: SignsPage,
});

function SignsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const { data, isLoading } = useQuery({
    queryKey: ["signs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("traffic_signs")
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(
      (s) =>
        (category === "All" || s.category === category) &&
        (!q || s.name.toLowerCase().includes(q) || s.meaning.toLowerCase().includes(q)),
    );
  }, [data, query, category]);

  if (isLoading) return <Spinner label="Loading signs" />;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Traffic sign library</h1>
      <p className="mt-2 text-muted-foreground">
        Search by name or meaning, or filter by sign category.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search signs…"
            className="pl-10"
            maxLength={60}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["All", ...signCategories].map((c) => (
            <Button
              key={c}
              size="sm"
              variant={category === c ? "primary" : "outline"}
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No signs match your search" hint="Try a different word or category." />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((sign) => (
            <Card key={sign.id} className="transition-shadow hover:shadow-lift">
              <div className="flex items-start gap-4">
                <SignGlyph glyph={sign.glyph} category={sign.category} />
                <div className="min-w-0">
                  <Chip
                    tone={
                      sign.category === "Mandatory"
                        ? "danger"
                        : sign.category === "Warning"
                          ? "accent"
                          : "primary"
                    }
                  >
                    {sign.category}
                  </Chip>
                  <h2 className="mt-2 font-display text-lg font-semibold">{sign.name}</h2>
                </div>
              </div>
              <p className="mt-4 text-sm">{sign.meaning}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-semibold">Where used: </span>
                {sign.usage_note}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
