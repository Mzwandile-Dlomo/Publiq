import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["DATABASE_URL"],
    // directUrl: process.env["DIRECT_URL"],
  },
  migrations: {
    seed: "node prisma/seed.mjs",
  },
});




// import "dotenv/config";
// import { defineConfig } from "prisma/config";

// export default defineConfig({
//   schema: "prisma/schema.prisma",
//   datasource: {
//     url: process.env["DATABASE_URL"],
//     directUrl: process.env["DIRECT_URL"],
//   },
// });

