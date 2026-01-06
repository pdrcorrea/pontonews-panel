export default {
  async fetch(request) {
    const url = new URL(request.url);

    // rota compatível com seu painel
    if (url.pathname === "/api/news") {
      return new Response(
        JSON.stringify({
          ok: true,
          items: [
            {
              title: "Worker online: agora é só plugar os feeds reais",
              link: "https://www.es.gov.br",
              pubDate: new Date().toISOString(),
              image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1600&q=70"
            }
          ]
        }),
        {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": "*",
            "cache-control": "no-store"
          }
        }
      );
    }

    return new Response("OK", { status: 200 });
  }
};
