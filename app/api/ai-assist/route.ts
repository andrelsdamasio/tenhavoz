import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MODEL = "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SHORTEN_INSTRUCTION = [
  "Você reescreve textos de manifestos/campanhas de mobilização em português do Brasil.",
  "Mantenha o mesmo tom, os mesmos argumentos e a intenção do texto original.",
  "Não invente fatos, números ou promessas que não estejam no texto original.",
  "Responda apenas com o texto reescrito, sem aspas, sem comentários, sem explicações.",
].join(" ");

const TITLE_INSTRUCTION = [
  "Você cria títulos curtos para páginas de campanhas de mobilização em português do Brasil.",
  "O título deve ter no máximo 60 caracteres e resumir o pedido central do texto.",
  "Responda apenas com o título, sem aspas, sem ponto final, sem comentários.",
].join(" ");

const AUTO_FILL_INSTRUCTION = [
  "Você ajuda a preencher páginas de campanhas de mobilização (abaixo-assinados enviados por e-mail) em português do Brasil, a partir do texto do manifesto escrito pela pessoa.",
  "A partir do texto do manifesto, gere:",
  "- title: um título curto (máximo 60 caracteres) que resuma o pedido central, sem aspas nem ponto final.",
  "- subject: um assunto de e-mail curto e direto (máximo 80 caracteres) para o e-mail que será enviado.",
  "- subtitle: um resumo persuasivo do manifesto em no máximo 5 linhas curtas (até uns 260 caracteres no total), que convença quem visita a página a ler e enviar o e-mail. Não repita o texto do manifesto literalmente, resuma.",
  "Não invente fatos, números ou promessas que não estejam no texto original. Responda só com os três campos pedidos.",
].join(" ");

const AUTO_FILL_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    subject: { type: "STRING" },
    subtitle: { type: "STRING" },
  },
  required: ["title", "subject", "subtitle"],
};

interface AutoFillResult {
  title: string;
  subject: string;
  subtitle: string;
}

async function callGemini(
  apiKey: string,
  systemInstruction: string,
  userText: string,
  opts?: { maxOutputTokens?: number; jsonSchema?: object }
): Promise<string> {
  const res = await fetch(`${API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: {
        maxOutputTokens: opts?.maxOutputTokens ?? 512,
        ...(opts?.jsonSchema
          ? { responseMimeType: "application/json", responseSchema: opts.jsonSchema }
          : {}),
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("") ?? "";
  return text.trim();
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Recurso de IA não configurado no servidor." },
      { status: 503 }
    );
  }

  let body: { text?: string; task?: "shorten" | "title" | "auto_fill"; targetLength?: number };
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

  if (task !== "shorten" && task !== "title" && task !== "auto_fill") {
    return NextResponse.json({ error: "task inválida." }, { status: 400 });
  }

  try {
    if (task === "shorten") {
      const targetLength = body.targetLength ?? 2000;
      const result = await callGemini(
        apiKey,
        SHORTEN_INSTRUCTION,
        `Reescreva o texto abaixo com no máximo ${targetLength} caracteres:\n\n${text}`,
        { maxOutputTokens: 2048 }
      );
      return NextResponse.json({ result });
    }

    if (task === "title") {
      const result = await callGemini(apiKey, TITLE_INSTRUCTION, text, { maxOutputTokens: 100 });
      return NextResponse.json({ result });
    }

    const raw = await callGemini(apiKey, AUTO_FILL_INSTRUCTION, text, {
      maxOutputTokens: 512,
      jsonSchema: AUTO_FILL_SCHEMA,
    });
    const parsed = JSON.parse(raw) as AutoFillResult;
    return NextResponse.json({ result: parsed });
  } catch (error) {
    console.error("Erro ao chamar a API do Gemini:", error);
    return NextResponse.json(
      { error: "Falha ao gerar sugestão com IA. Tente novamente." },
      { status: 502 }
    );
  }
}
