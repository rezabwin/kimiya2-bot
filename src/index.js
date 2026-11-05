export default {
  async fetch(request, env, ctx) {
    return new Response(
      JSON.stringify({ 
        ok: true, 
        status: "Kimiya2 Bot is running",
        time: new Date().toISOString()
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  },
};
