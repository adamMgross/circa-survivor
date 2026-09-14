import { execSync } from "node:child_process";
for (const t of ["parse", "pct"]) {
  execSync(`npx esbuild test/${t}.test.jsx --bundle --platform=node --outfile=test/${t}.test.js --loader:.jsx=jsx --jsx=automatic --external:react --external:react-dom`, { stdio: "inherit" });
  console.log(`\n== ${t} ==`); execSync(`node test/${t}.test.js`, { stdio: "inherit" });
}
