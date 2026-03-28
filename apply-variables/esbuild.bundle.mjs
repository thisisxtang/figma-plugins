import * as esbuild from "esbuild";
import * as process from "node:process";

const main = async () => {
  console.log(process.argv);
  const input = process.argv[2] ?? "--build";
  switch (input) {
    case "--build":
      await esbuild.build(esbuildConfig);
      return;
    case "--watch":
      const ctx = await esbuild.context(esbuildConfig);
      await ctx.watch();
      return;
    default:
      console.error("Unknown command:", input);
  }
};

const esbuildConfig = {
  entryPoints: ["./src/code.ts"],
  bundle: true,
  minify: false,
  sourcemap: true,
  target: ["es2017"],
  platform: "browser",
  tsconfig: "./tsconfig.json",
  outfile: "./target/code.js",
};

await main();
