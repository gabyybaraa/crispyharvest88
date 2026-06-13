import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import fs from "fs";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);

app.use(express.json());

function loadFirebaseServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const localServiceAccountPath = new URL("./serviceAccountKey.json", import.meta.url);

  if (fs.existsSync(localServiceAccountPath)) {
    return JSON.parse(fs.readFileSync(localServiceAccountPath, "utf8"));
  }

  throw new Error(
    "Missing Firebase service account. Set FIREBASE_SERVICE_ACCOUNT_JSON or add crispyharvest_backend/serviceAccountKey.json locally."
  );
}

admin.initializeApp({
  credential: admin.credential.cert(loadFirebaseServiceAccount()),
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

app.get("/", (req, res) => {
  res.send("Crispy Harvest backend is running.");
});

app.post("/api/send-reset-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    await admin.auth().getUserByEmail(cleanEmail);

    const resetLink = await admin.auth().generatePasswordResetLink(cleanEmail, {
      url: process.env.FRONTEND_URL || "http://localhost:5173",
      handleCodeInApp: false,
    });

    await transporter.sendMail({
      from: `"Crispy Harvest" <${process.env.GMAIL_USER}>`,
      to: cleanEmail,
      subject: "Reset your Crispy Harvest password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Reset your Crispy Harvest password</h2>

          <p>Hello,</p>

          <p>Click the button below to reset your password.</p>

          <p>
            <a href="${resetLink}" style="background:#A37F61;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;">
              Reset Password
            </a>
          </p>

          <p>If the button does not work, copy and paste this link:</p>

          <p>${resetLink}</p>

          <p>If you did not request this, you can ignore this email.</p>

          <p>Thank you,<br/>Crispy Harvest Team</p>
        </div>
      `,
    });

    return res.json({
      message: "Reset email sent.",
    });
  } catch (error) {
    console.log("RESET EMAIL ERROR:", error);

    if (error.code === "auth/user-not-found") {
      return res.status(404).json({
        message: "No account found with this email.",
      });
    }

    if (
      error.message?.includes("RESET_PASSWORD_EXCEED_LIMIT") ||
      error.code === "auth/internal-error"
    ) {
      return res.status(429).json({
        message: "Too many reset attempts. Please wait and try again later.",
      });
    }

    return res.status(500).json({
      message: "Failed to send reset email.",
      error: error.message,
      code: error.code || "unknown",
    });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Backend running on http://localhost:${process.env.PORT || 5000}`);
});