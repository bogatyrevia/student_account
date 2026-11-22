"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type DisciplineOption = { id: string; name: string };

const MAX_BYTES = 15 * 1024 * 1024;

export function MaterialUploadForm({ disciplines }: { disciplines: DisciplineOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setError("Выберите файл для загрузки.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Файл больше 15 МБ. Выберите файл меньшего размера.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/materials", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка при загрузке");
      } else {
        form.reset();
        router.refresh();
      }
    } catch {
      setError("Сетевая ошибка при отправке файла");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="text-[16px] font-semibold">Загрузить учебный материал</h2>
      <form onSubmit={handleSubmit} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          name="title"
          type="text"
          placeholder="Название (необязательно)"
          className="min-h-11 rounded-xl border border-border bg-surface px-3 text-sm"
        />

        <select
          name="disciplineId"
          required
          defaultValue=""
          className="min-h-11 rounded-xl border border-border bg-surface px-3 text-sm"
        >
          <option value="" disabled>
            Выберите предмет...
          </option>
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          name="course"
          required
          defaultValue="1"
          className="min-h-11 rounded-xl border border-border bg-surface px-3 text-sm"
        >
          {[1, 2, 3, 4, 5, 6].map((c) => (
            <option key={c} value={c}>
              {c} курс (год обучения)
            </option>
          ))}
        </select>

        <input
          name="file"
          type="file"
          required
          className="min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-surface-muted file:px-2.5 file:py-1 file:text-xs file:font-medium"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
          <span className="text-xs text-muted">Максимальный размер файла: 15 МБ</span>
          <Button type="submit" disabled={loading}>
            <Upload className="mr-1.5 h-4 w-4" />
            {loading ? "Загрузка..." : "Опубликовать"}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-4">{error}</p>}
      </form>
    </Card>
  );
}
