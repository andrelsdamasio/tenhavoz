import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const MODEL = "claude-haiku-4-5-20251001";

const SHORTEN_SYSTEM = [
  "Você reescreve textos de manifestos/campanhas de mobilização em português do Brasil.",
  "Mantenha o mesmo tom, os mesmos argumentos e a intenção do texto original.",
  "Não invente fatos, números ou promessas que não estejam no texto original.",
  "Responda apenas com o texto reescrito, sem aspas, sem comentários, sem explicações.",
].join(" ");

const TITLE_SYSTEM = [
  "Você cria títulos curtos para páginas de campanhas de mobilização em português do Brasil.",
  "O título deve ter no máximo 60 caracteres e resumir o pedido central do texto.",
  "Responda apenas com o título, sem aspas, sem ponto final, sem comentários.",
].join(" ");

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Recurso de IA não configurado no servidor." },
      { status: 503 }
    );
  }

  let body: { text?: string; task?: "shorten" | "title"; targetLength?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  const task = body.task;

  if (!text) {
    return NextResponse.json({ error: "Texto vazio." }, { status: 400 });
  }

  if (task !== "shorten" && task !== "title") {
    return NextResponse.json({ error: "task inválida." }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    if (task === "shorten") {
      const targetLength = body.targetLength ?? 2000;
      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SHORTEN_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Reescreva o texto abaixo com no máximo ${targetLength} caracteres:\n\n${text}`,
          },
        ],
      });
      const result = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();
      return NextResponse.json({ result });
    }

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 100,
      system: TITLE_SYSTEM,
      messages: [{ role: "user", content: text }],
    });
    const result = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Erro ao chamar a API da Anthropic:", error);
    return NextResponse.json(
      { error: "Falha ao gerar sugestão com IA. Tente novamente." },
      { status: 502 }
    );
  }
}
