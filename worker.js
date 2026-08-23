export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API
    if (url.pathname === "/api/test") {
      return Response.json({
        success: true,
        message: "VEXON API is working!",
      });
    }

    // Website
    return env.ASSETS.fetch(request);
  },
};
