import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { requireUser } from "@/lib/auth/guards";
import { db as prisma } from "@/lib/db";
import { cn, formatDateTime } from "@/lib/utils";
import { MaterialUploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Учебные материалы" };

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; disciplineId?: string }>;
}) {
  const ctx = await requireUser();
  const { course: rawCourse, disciplineId } = await searchParams;
  const selectedCourse = rawCourse ? Number(rawCourse) : undefined;
  const canUpload = ctx.role === "TEACHER" || ctx.role === "STAFF";

  const [disciplines, materials] = await Promise.all([
    prisma.discipline.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.material.findMany({
      where: {
        ...(selectedCourse ? { course: selectedCourse } : {}),
        ...(disciplineId ? { disciplineId } : {}),
      },
      include: {
        discipline: { select: { id: true, name: true } },
        author: {
          select: {
            role: true,
            teacher: { select: { shortName: true } },
            staff: { select: { fullName: true } },
          },
        },
      },
      orderBy: [{ course: "asc" }, { discipline: { name: "asc" } }, { createdAt: "desc" }],
    }),
  ]);

  // Группировка: Курс -> Предмет -> Материалы
  const grouped = new Map<number, Map<string, typeof materials>>();
  for (const m of materials) {
    if (!grouped.has(m.course)) grouped.set(m.course, new Map());
    const byDisc = grouped.get(m.course)!;
    const discName = m.discipline.name;
    if (!byDisc.has(discName)) byDisc.set(discName, []);
    byDisc.get(discName)!.push(m);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-bold lg:text-[32px]">Материалы</h1>
        <p className="mt-1 text-muted">Лекции, методички и задания по курсам и предметам</p>
      </div>

      {canUpload && <MaterialUploadForm disciplines={disciplines} />}

      {/* Фильтр по году обучения (курсу) */}
      <nav aria-label="Фильтр по курсу" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <ul className="flex gap-2">
          <li>
            <Link
              href={disciplineId ? `/materials?disciplineId=${disciplineId}` : "/materials"}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full px-3.5 text-sm font-medium whitespace-nowrap",
                !selectedCourse ? "bg-primary text-on-primary" : "bg-surface-muted text-muted hover:text-text",
              )}
            >
              Все курсы
            </Link>
          </li>
          {[1, 2, 3, 4, 5, 6].map((c) => {
            const active = selectedCourse === c;
            const href = disciplineId ? `/materials?course=${c}&disciplineId=${disciplineId}` : `/materials?course=${c}`;
            return (
              <li key={c}>
                <Link
                  href={href}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full px-3.5 text-sm font-medium whitespace-nowrap",
                    active ? "bg-primary text-on-primary" : "bg-surface-muted text-muted hover:text-text",
                  )}
                >
                  {c} курс
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {materials.length === 0 ? (
        <EmptyState icon={FileText} title="Материалов пока нет">
          По выбранным параметрам файлы ещё не загружены.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([course, byDisc]) => (
            <section key={course} className="space-y-3">
              <h2 className="text-lg font-bold">{course} курс (год обучения)</h2>
              {[...byDisc.entries()].map(([discName, items]) => (
                <Card key={discName} className="space-y-3">
                  <h3 className="text-[15px] font-semibold">{discName}</h3>
                  <ul className="divide-y divide-border">
                    {items.map((m) => {
                      const authorName =
                        m.author.teacher?.shortName || m.author.staff?.fullName || "Сотрудник вуза";
                      return (
                        <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{m.title}</p>
                            <p className="text-xs text-muted">
                              {m.fileName} · {formatSize(m.sizeBytes)} · {authorName} · {formatDateTime(m.createdAt)}
                            </p>
                          </div>
                          <a
                            href={`/api/materials?id=${m.id}`}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-surface-muted px-3 text-xs font-medium hover:text-text"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Скачать
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
