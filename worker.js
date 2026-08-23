export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        success: true,
        message: "VEXON API is online!"
      });
    }

    return env.ASSETS.fetch(request);
  }
};
