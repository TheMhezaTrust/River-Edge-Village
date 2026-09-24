import { NextResponse } from "next/server";

export const ok = (data) => NextResponse.json(data);
export const created = (data) => NextResponse.json(data, { status: 201 });
export const bad = (message, status = 400) => NextResponse.json({ error: message }, { status });

export function parsePagination(searchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const perPage = Math.min(200, Math.max(5, parseInt(searchParams.get("perPage") || "25")));
  return { skip: (page - 1) * perPage, take: perPage, page, perPage };
}
