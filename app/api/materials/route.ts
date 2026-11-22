import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/auth/guards";
import { db as prisma } from "@/lib/db";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 МБ
const STORAGE_DIR = path.join(process.cwd(), "storage", "materials");

// Скачивание файла: GET /api/materials?id=...
export async function GET(req: Request) {
  const ctx = await getUserContext();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new NextResponse("Bad Request", { status: 400 });

  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) return new NextResponse("Not Found", { status: 404 });

  try {
    const filePath = path.join(STORAGE_DIR, material.storedName);
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": material.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(material.fileName)}`,
        "Content-Length": String(material.sizeBytes),
      },
    });
  } catch {
    return new NextResponse("File missing on disk", { status: 404 });
  }
}

// Загрузка файла: POST /api/materials
export async function POST(req: Request) {
  const ctx = await getUserContext();
  if (!ctx || (ctx.role !== "TEACHER" && ctx.role !== "STAFF")) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const disciplineId = String(formData.get("disciplineId") ?? "").trim();
  const course = Number(formData.get("course"));

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Выберите файл" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Размер файла не должен превышать 15 МБ" }, { status: 400 });
  }
  if (!disciplineId || !Number.isInteger(course) || course < 1 || course > 6) {
    return NextResponse.json({ error: "Укажите предмет и год обучения" }, { status: 400 });
  }

  const ext = path.extname(file.name).replace(/[^a-zA-Z0-9.]/g, "");
  const storedName = `${randomUUID()}${ext}`;

  await mkdir(STORAGE_DIR, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(STORAGE_DIR, storedName), bytes);

  await prisma.material.create({
    data: {
      title: title || file.name,
      fileName: file.name,
      storedName,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      course,
      disciplineId,
      authorId: ctx.userId,
    },
  });

  revalidatePath("/materials");
  return NextResponse.json({ ok: true });
}

// Удаление файла: DELETE /api/materials?id=...
export async function DELETE(req: Request) {
  const ctx = await getUserContext();
  if (!ctx || (ctx.role !== "TEACHER" && ctx.role !== "STAFF")) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Не указан ID" }, { status: 400 });

  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  if (material.authorId !== ctx.userId && ctx.role !== "STAFF") {
    return NextResponse.json({ error: "Можно удалять только свои файлы" }, { status: 403 });
  }

  await prisma.material.delete({ where: { id } });
  await unlink(path.join(STORAGE_DIR, material.storedName)).catch(() => {});

  revalidatePath("/materials");
  return NextResponse.json({ ok: true });
}
