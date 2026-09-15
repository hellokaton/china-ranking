// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  // site: "http://localhost:4321",
  site: "https://china-ranking.vercel.app",
  // 沿用 Astro 5 的无损空白压缩，Astro 7 默认的 JSX 规则会吞掉元素间空格
  compressHTML: true,
});
