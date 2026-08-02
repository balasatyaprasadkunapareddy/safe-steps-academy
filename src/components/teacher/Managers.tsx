import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button, Card, Chip, Input, Label, Select, Spinner, Textarea } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";

type Lesson = {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  tips: string[];
  image_key: string | null;
  order_index: number;
};

const emptyLesson = {
  title: "",
  category: "Pedestrian",
  summary: "",
  content: "",
  tips: "",
  image_key: "pedestrian",
  order_index: 0,
};

export function LessonManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [form, setForm] = useState({ ...emptyLesson });
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("*").order("order_index");
      if (error) throw error;
      return data as Lesson[];
    },
  });

  function startEdit(lesson: Lesson) {
    setEditing(lesson);
    setForm({
      title: lesson.title,
      category: lesson.category,
      summary: lesson.summary,
      content: lesson.content,
      tips: lesson.tips.join("\n"),
      image_key: lesson.image_key ?? "pedestrian",
      order_index: lesson.order_index,
    });
    setOpen(true);
  }

  async function save() {
    if (form.title.trim().length < 3 || form.summary.trim().length < 5) {
      toast.error("Title and summary are required");
      return;
    }
    const payload = {
      title: form.title.trim().slice(0, 120),
      category: form.category,
      summary: form.summary.trim().slice(0, 300),
      content: form.content.trim().slice(0, 4000),
      tips: form.tips.split("\n").map((t) => t.trim()).filter(Boolean).slice(0, 10),
      image_key: form.image_key,
      order_index: Number(form.order_index) || 0,
    };
    const { error } = editing
      ? await supabase.from("lessons").update(payload).eq("id", editing.id)
      : await supabase.from("lessons").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Lesson updated" : "Lesson added");
    setOpen(false);
    setEditing(null);
    setForm({ ...emptyLesson });
    queryClient.invalidateQueries({ queryKey: ["lessons"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Lesson deleted");
    queryClient.invalidateQueries({ queryKey: ["lessons"] });
  }

  if (isLoading) return <Spinner label="Loading lessons" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Lessons</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setForm({ ...emptyLesson });
            setOpen((v) => !v);
          }}
        >
          <Plus className="size-4" /> New lesson
        </Button>
      </div>

      {open && (
        <Card className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Title</Label>
              <Input value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {["Pedestrian", "Bicycle", "Two-Wheeler", "Vehicle"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Summary</Label>
            <Input value={form.summary} maxLength={300} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          </div>
          <div>
            <Label>Content</Label>
            <Textarea rows={5} maxLength={4000} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <div>
            <Label>Safety tips (one per line)</Label>
            <Textarea rows={4} value={form.tips} onChange={(e) => setForm({ ...form, tips: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Illustration</Label>
              <Select value={form.image_key} onChange={(e) => setForm({ ...form, image_key: e.target.value })}>
                {["pedestrian", "bicycle", "twowheeler", "bus"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Order</Label>
              <Input
                type="number"
                value={form.order_index}
                onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save}>{editing ? "Save changes" : "Add lesson"}</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {data?.map((lesson) => (
          <Card key={lesson.id} className="flex flex-wrap items-center gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{lesson.title}</p>
              <p className="truncate text-sm text-muted-foreground">{lesson.summary}</p>
            </div>
            <Chip tone="primary">{lesson.category}</Chip>
            <Button size="icon" variant="ghost" onClick={() => startEdit(lesson)} aria-label="Edit lesson">
              <Pencil className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => remove(lesson.id)} aria-label="Delete lesson">
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

type Question = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  category: string;
};

const emptyQuestion = {
  question: "",
  options: ["", "", "", ""],
  correct_index: 0,
  explanation: "",
  category: "General",
};

export function QuestionManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState<typeof emptyQuestion>({ ...emptyQuestion });
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["quiz-questions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quiz_questions").select("*").order("category");
      if (error) throw error;
      return data as Question[];
    },
  });

  async function save() {
    const options = form.options.map((o) => o.trim()).filter(Boolean);
    if (form.question.trim().length < 5 || options.length < 2) {
      toast.error("A question and at least two options are required");
      return;
    }
    const payload = {
      question: form.question.trim().slice(0, 300),
      options,
      correct_index: Math.min(form.correct_index, options.length - 1),
      explanation: form.explanation.trim().slice(0, 500),
      category: form.category.trim().slice(0, 40) || "General",
    };
    const { error } = editing
      ? await supabase.from("quiz_questions").update(payload).eq("id", editing.id)
      : await supabase.from("quiz_questions").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Question updated" : "Question added");
    setOpen(false);
    setEditing(null);
    setForm({ ...emptyQuestion, options: ["", "", "", ""] });
    queryClient.invalidateQueries({ queryKey: ["quiz-questions"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Question deleted");
    queryClient.invalidateQueries({ queryKey: ["quiz-questions"] });
  }

  if (isLoading) return <Spinner label="Loading questions" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Quiz questions ({data?.length ?? 0})</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setForm({ ...emptyQuestion, options: ["", "", "", ""] });
            setOpen((v) => !v);
          }}
        >
          <Plus className="size-4" /> New question
        </Button>
      </div>

      {open && (
        <Card className="space-y-3">
          <div>
            <Label>Question</Label>
            <Input value={form.question} maxLength={300} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {form.options.map((option, i) => (
              <div key={i}>
                <Label>
                  Option {String.fromCharCode(65 + i)}
                  {form.correct_index === i ? " (correct)" : ""}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={option}
                    maxLength={160}
                    onChange={(e) => {
                      const next = [...form.options];
                      next[i] = e.target.value;
                      setForm({ ...form, options: next });
                    }}
                  />
                  <Button
                    size="sm"
                    variant={form.correct_index === i ? "primary" : "outline"}
                    onClick={() => setForm({ ...form, correct_index: i })}
                  >
                    ✓
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Category</Label>
              <Input value={form.category} maxLength={40} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <Label>Explanation</Label>
              <Input
                value={form.explanation}
                maxLength={500}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save}>{editing ? "Save changes" : "Add question"}</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {data?.map((q) => (
          <Card key={q.id} className="flex flex-wrap items-center gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{q.question}</p>
              <p className="truncate text-xs text-muted-foreground">
                Correct: {q.options[q.correct_index]}
              </p>
            </div>
            <Chip tone="accent">{q.category}</Chip>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Edit question"
              onClick={() => {
                setEditing(q);
                setForm({
                  question: q.question,
                  options: [...q.options, "", "", "", ""].slice(0, 4),
                  correct_index: q.correct_index,
                  explanation: q.explanation,
                  category: q.category,
                });
                setOpen(true);
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => remove(q.id)} aria-label="Delete question">
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function BadgeManager() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", description: "", min_xp: 0 });

  const { data } = useQuery({
    queryKey: ["badges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("badges").select("*").order("min_xp");
      if (error) throw error;
      return data;
    },
  });

  async function add() {
    if (form.name.trim().length < 3) { toast.error("Badge name is required"); return; }
    const { error } = await supabase.from("badges").insert({
      name: form.name.trim().slice(0, 60),
      description: form.description.trim().slice(0, 200),
      min_xp: Number(form.min_xp) || 0,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Badge added");
    setForm({ name: "", description: "", min_xp: 0 });
    queryClient.invalidateQueries({ queryKey: ["badges"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("badges").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Badge removed");
    queryClient.invalidateQueries({ queryKey: ["badges"] });
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold">Badges</h2>
      <Card className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <Label>Name</Label>
          <Input value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <Input
            value={form.description}
            maxLength={200}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label>Min XP</Label>
            <Input type="number" value={form.min_xp} onChange={(e) => setForm({ ...form, min_xp: Number(e.target.value) })} />
          </div>
          <Button onClick={add}>Add</Button>
        </div>
      </Card>

      <div className="space-y-2">
        {data?.map((badge) => (
          <Card key={badge.id} className="flex items-center gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{badge.name}</p>
              <p className="truncate text-sm text-muted-foreground">{badge.description}</p>
            </div>
            <Chip tone="primary">{badge.min_xp} XP</Chip>
            <Button size="icon" variant="ghost" onClick={() => remove(badge.id)} aria-label="Delete badge">
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
