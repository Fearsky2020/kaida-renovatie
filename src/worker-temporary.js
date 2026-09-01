import worker from "./worker.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/" && env.ASSETS) {
      const indexUrl = new URL(request.url);
      indexUrl.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }

    return worker.fetch(request, env, ctx);
  },
};
