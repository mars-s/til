import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// AI-enhanced scheduling via Claude.
// Requires ANTHROPIC_API_KEY env secret + AI_SCHEDULING_ENABLED = "true".
// If not enabled, returns empty suggestions and the app falls back to the
// local heuristic (til-core/scheduler) which always runs offline.

interface ScheduleRequest {
  task: {
    title: string;
    description?: string;
    duration_minutes: number;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    tags: string[];
  };
  free_slots: Array<{ start: string; end: string }>;
  preferences: {
    work_hours: [number, number];
    focus_time: [number, number];
  };
}

interface Suggestion {
  start: string;
  end: string;
  confidence: number;
  reason: string;
}

serve(async (req) => {
  // Check if AI scheduling is enabled via env toggle
  const aiEnabled = Deno.env.get('AI_SCHEDULING_ENABLED') === 'true';
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!aiEnabled || !apiKey) {
    // Return empty — client falls back to local heuristic
    return new Response(JSON.stringify({ suggestions: [], ai_enabled: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body: ScheduleRequest = await req.json();

  try {
    // Dynamic import so the function still deploys without the SDK when disabled
    const Anthropic = (await import('npm:@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

    const prompt = `You are a scheduling assistant. Given this task and free time slots, rank the top 3 best slots and provide a brief reason for each.

Task: ${JSON.stringify(body.task)}
Free slots (ISO8601): ${JSON.stringify(body.free_slots)}
User preferences (work_hours 24h, focus_time deep work window): ${JSON.stringify(body.preferences)}

Respond ONLY with valid JSON matching this exact shape:
{
  "suggestions": [
    { "start": "<ISO8601>", "end": "<ISO8601>", "confidence": 0.0-1.0, "reason": "<short natural language>" }
  ]
}`;

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const parsed = JSON.parse(text);
    const suggestions: Suggestion[] = parsed.suggestions ?? [];

    return new Response(JSON.stringify({ suggestions, ai_enabled: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Smart schedule error:', err);
    return new Response(JSON.stringify({ suggestions: [], ai_enabled: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
