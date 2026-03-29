// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeMermaid from "rehype-mermaid";

// https://astro.build/config
export default defineConfig({
  site: "https://nathaliacastelobranco.github.io",
  integrations: [mdx(), sitemap()],
  markdown: {
    syntaxHighlight: {
      type: "shiki",
      excludeLangs: ["mermaid", "math"],
    },
    rehypePlugins: [
      rehypePrettyCode,
      [
        rehypeMermaid,
        { strategy: "img-svg", dark: false, colorScheme: "forest" },
      ],
    ],
  },
});
