require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./db");

async function createOrResetAdmin() {
  const email =
    typeof process.env.ADMIN_EMAIL === "string"
      ? process.env.ADMIN_EMAIL.trim().toLowerCase()
      : "";
  const password =
    typeof process.env.ADMIN_PASSWORD === "string"
      ? process.env.ADMIN_PASSWORD
      : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("ADMIN_EMAIL belum diatur dengan format email yang valid.");
  }

  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error(
      "ADMIN_PASSWORD harus 12-72 byte agar sesuai dengan batas bcrypt.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.execute(
    `INSERT INTO admin_users (email, password_hash)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [email, passwordHash],
  );
  console.log("Admin account created or password reset successfully.");
}

createOrResetAdmin()
  .catch((error) => {
    console.error("Failed to create or reset admin:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
