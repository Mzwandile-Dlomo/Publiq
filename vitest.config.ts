import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        setupFiles: ["./tests/setup.ts"],
        exclude: [...configDefaults.exclude, "tests/browser/**"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
            ".prisma/client": path.resolve(__dirname, "node_modules/.prisma/client/index.js"),
        },
    },
});
