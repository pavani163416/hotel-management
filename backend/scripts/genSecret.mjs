import { randomBytes } from "crypto";
console.log("New JWT_SECRET:");
console.log(randomBytes(64).toString("hex"));
