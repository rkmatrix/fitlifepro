// Supabase Edge Function: weekly-report
// Runs every Sunday at 3 PM via Supabase cron: 0 15 * * 0

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

  // Get all users
  const usersRes = await fetch(`${supabaseUrl}/rest/v1/users?select=id,name,phase,week_number`, {
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
  });
  const users = await usersRes.json();

  for (const user of users) {
    // Gather weekly stats
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const logsRes = await fetch(
      `${supabaseUrl}/rest/v1/workout_logs?user_id=eq.${user.id}&date=gte.${weekAgo}&select=status`,
      { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
    );
    const logs = await logsRes.json();
    const completed = logs.filter((l: { status: string }) => ['done', 'partial', 'makeup'].includes(l.status)).length;
    const completionPct = Math.round((completed / 5) * 100);

    // Generate AI summary
    const prompt = `Generate a brief (2-3 sentence), personalized weekly fitness report for ${user.name}. 
Phase ${user.phase}, Week ${user.week_number}. Workout completion this week: ${completionPct}%.
Be direct, honest, and motivating. Reference specific next steps.`;

    let aiSummary = `Week ${user.week_number} complete. ${completionPct}% workout completion.`;
    try {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
        }),
      });
      const openaiData = await openaiRes.json();
      aiSummary = openaiData.choices?.[0]?.message?.content ?? aiSummary;
    } catch {}

    // Save weekly report
    await fetch(`${supabaseUrl}/rest/v1/weekly_reports`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: user.id,
        week_start: weekAgo,
        completion_pct: completionPct,
        avg_nutrition_score: 70,
        weight_delta_kg: 0,
        avg_sleep_score: 0,
        ai_summary: aiSummary,
        adjustments: [],
      }),
    });

    // Advance week number
    await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ week_number: user.week_number + 1 }),
    });
  }

  return new Response(JSON.stringify({ processed: users.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
