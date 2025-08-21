import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import fetch from 'node-fetch';

type DocChunk = {
  _id: string;
  siteKey: string;
  chunk: string;
  createdAt: Date | string;
};

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

@Injectable()
export class AskService {
  constructor(@InjectModel('DocChunk') private docChunkModel: Model<DocChunk>) {}

  // ----------------- helpers -----------------
  private tokenize(s: string): string[] {
    return (s || '')
      .toLowerCase()
      .split(/[^a-z0-9áéíóúâêîôûãõçüñ]+/i)
      .filter(Boolean);
  }

  private overlapScore(qTokens: Set<string>, text: string): number {
    const t = this.tokenize(text);
    const textSet = new Set(t);
    let k = 0;
    qTokens.forEach((tok) => {
      if (textSet.has(tok)) k++;
    });
    return k / Math.max(1, qTokens.size);
  }

  // Heurística: detectar intenção de contato
  private wantsContact(q: string): boolean {
    const s = q.toLowerCase();
    return /contact|contato|owner|vendedor|sales|comercial|falar com|lead|visit|agendar|orcamento|orçamento|proposta|budget|pricing contact|talk to|get in touch|reach out|telefone|whatsapp|whats/i.test(
      s,
    );
  }

  // Heurística leve de idioma com base em stopwords
  private detectLang(q: string): { code: 'en' | 'pt' | 'es' | 'fr'; score: number } {
    const tokens = this.tokenize(q);
    if (!tokens.length) return { code: 'en', score: 0 };

    const SW: Record<string, string[]> = {
      en: ['the', 'and', 'is', 'are', 'of', 'to', 'in', 'for', 'with', 'how', 'much', 'what', 'can', 'you', 'help'],
      pt: ['de', 'e', 'que', 'o', 'a', 'os', 'as', 'um', 'uma', 'como', 'quanto', 'vc', 'você', 'ajuda', 'contato'],
      es: ['de', 'y', 'que', 'el', 'la', 'los', 'las', 'un', 'una', 'cómo', 'cuánto', 'ayuda', 'contacto'],
      fr: ['de', 'et', 'que', 'le', 'la', 'les', 'un', 'une', 'comment', 'combien', 'aide', 'contact'],
    };

    const scores: Record<'en' | 'pt' | 'es' | 'fr', number> = { en: 0, pt: 0, es: 0, fr: 0 };
    const tset = new Set(tokens);

    (Object.keys(SW) as Array<'en' | 'pt' | 'es' | 'fr'>).forEach((code) => {
      let hit = 0;
      for (const w of SW[code]) if (tset.has(w)) hit++;
      scores[code] = hit / Math.max(6, tokens.length);
    });

    let best: 'en' | 'pt' | 'es' | 'fr' = 'en';
    let bestScore = -1;
    for (const code of ['en', 'pt', 'es', 'fr'] as const) {
      if (scores[code] > bestScore) {
        bestScore = scores[code];
        best = code;
      }
    }

    const asciiOnly = /^[\x00-\x7F]+$/.test(q);
    if (asciiOnly) {
      const likelyEn = /(how much|what is|could you|can you|please|help|pricing|storage|plan)/i.test(q);
      if (likelyEn) return { code: 'en', score: Math.max(bestScore, 0.51) };
    }

    return { code: best, score: bestScore };
  }

  // ----------------- main -----------------
  async answerQuestion(siteKey: string, question: string) {
    if (!siteKey) return { error: 'Missing x-site-key header' };
    if (!question?.trim()) return { error: 'Missing question in request body' };

    const DEMO_MODE = (process.env.DEMO_MODE || 'off').toLowerCase(); // 'free' | 'doc' | 'off'
    const DEMO_TEXT =
      process.env.DEMO_TEXT || 'This is a demo document. Use it as context if present.';
    const LEAD_MODE = (process.env.LEAD_MODE || 'auto').toLowerCase(); // 'auto' | 'always' | 'off'
    const LEAD_THRESHOLD = Number(process.env.LEAD_THRESHOLD ?? 0.35);

    const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL?.trim() || 'llama3';
    const OLLAMA_TEMPERATURE = Number(process.env.OLLAMA_TEMPERATURE ?? 0.2);
    const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 45000);

    const q = question.trim();
    const langGuess = this.detectLang(q);

    // ----------------- SEMPRE tentar buscar contexto dos docs -----------------
    let contextText = '';
    let usedChunks = 0;
    let confidence = 0.0;

    const qTokensArr = this.tokenize(q);
    const qTokens = new Set(qTokensArr);

    const orTerms = Array.from(qTokens)
      .filter((tok) => tok.length >= 3)
      .slice(0, 8)
      .map((tok) => ({
        chunk: {
          $regex: tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          $options: 'i',
        },
      }));

    let candidates: DocChunk[] = [];
    try {
      if (orTerms.length) {
        candidates = await this.docChunkModel
          .find({ siteKey, $or: orTerms })
          .sort({ createdAt: -1 })
          .limit(200)
          .lean();
      }
      if (!candidates.length) {
        candidates = await this.docChunkModel
          .find({ siteKey })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();
      }
    } catch (_) {
      candidates = []; // se Mongo falhar, segue sem contexto
    }

    if (candidates.length) {
      const scored = candidates
        .map((c) => ({ doc: c, score: this.overlapScore(qTokens, c.chunk) }))
        .sort((a, b) => b.score - a.score);

      const top = scored.slice(0, 5);
      contextText = top.map((x) => x.doc.chunk).join('\n---\n');
      usedChunks = top.length;
      confidence = top[0]?.score ?? 0;
    } else {
      if (DEMO_MODE === 'doc') {
        contextText = DEMO_TEXT;
        usedChunks = 1;
        confidence = 0.85;
      } else if (DEMO_MODE === 'free') {
        confidence = 0.9; // livre mesmo
      }
    }

    // ----------------- Prompt: RAG-first -> depois free -----------------
    const userWantsContact = this.wantsContact(q);

    const ragFirstDirective = [
      `You have two knowledge sources:`,
      `  (1) "CONTEXT" = official Cloudly docs extracted into chunks (most trustworthy).`,
      `  (2) Your general world knowledge (fallback only).`,
      `ALWAYS try to answer using CONTEXT first. If the answer is not present or unclear in CONTEXT, then answer reasonably using your general knowledge.`,
      `When you use general knowledge, keep it generic and consistent with CONTEXT.`,
    ].join('\n');

    const languageDirective = [
      `Language hint: ${langGuess.code} (confidence=${langGuess.score.toFixed(2)})`,
      `STRICTLY answer in language code "${langGuess.code}".`,
      `Do NOT switch languages unless the user explicitly asks.`,
    ].join('\n');

    const leadDirective =
      `If the user asks for human contact, sales, lead, quote, meeting, owner, or anything requiring follow-up, append "<FOLLOW_UP_NEEDED>" EXACTLY ONCE at the very end (no extra text after the tag).`;

    const styleHint =
      DEMO_MODE === 'free'
        ? 'Be conversational and concise.'
        : 'Stay grounded in the provided context whenever possible.';

    const prompt = [
      `System: You are an assistant for a product FAQ demo. ${styleHint}`,
      languageDirective,
      ragFirstDirective,
      `If the answer is not clear from the context, you may still provide a helpful, reasonable answer.`,
      leadDirective,
      '',
      '=== CONTEXT START ===',
      contextText || '(no explicit context)',
      '=== CONTEXT END ===',
      '',
      `User question: ${q}`,
      'Assistant answer:',
    ].join('\n');

    // ----------------- Call LLM (Ollama) -----------------
    let answer = '';
    try {
      const ac = new AbortController();
      const id = setTimeout(() => ac.abort(), OLLAMA_TIMEOUT_MS);

      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
          options: { temperature: OLLAMA_TEMPERATURE },
        }),
        // @ts-ignore
        signal: ac.signal,
      } as any);

      clearTimeout(id);

      if (!response.ok) {
        const msg = await response.text().catch(() => String(response.status));
        return { error: 'Failed to reach LLM', status: response.status, message: msg };
      }

      const data = (await response.json()) as OllamaResponse;
      answer = data.response || 'No answer generated';
    } catch (err: any) {
      return { error: 'LLM request failed', message: String(err?.message || err) };
    }

    // Tag de follow-up no final (tolerante a espaços/linhas)
    let needsFollowUp = false;
    const followUpTag = /<FOLLOW_UP_NEEDED>\s*$/;
    if (followUpTag.test(answer.trim())) {
      needsFollowUp = true;
      answer = answer.replace(followUpTag, '').trim();
    }

    // ----------------- Lead form logic -----------------
    let showLead = false;
    let leadHint = '';
    if (LEAD_MODE === 'always') {
      showLead = true;
      leadHint = 'mode=always';
    } else if (LEAD_MODE === 'off') {
      showLead = false;
      leadHint = 'mode=off';
    } else {
      if (userWantsContact) {
        showLead = true;
        leadHint = 'intent=contact';
      } else if (needsFollowUp) {
        showLead = true;
        leadHint = 'model_tag';
      } else if (typeof confidence === 'number' && confidence < LEAD_THRESHOLD) {
        showLead = true;
        leadHint = 'low_confidence';
      }
    }

    return {
      answer,
      confidence,
      usedChunks,
      needsFollowUp: showLead,
      leadHint,
      sources: contextText ? ['context'] : [],
      mode: DEMO_MODE,
      lang: langGuess.code,
    };
  }
}
