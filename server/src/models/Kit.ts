import mongoose, { Schema } from "mongoose";
import { createHash } from "node:crypto";

export type ItemSource = "generated" | "edited" | "manual";
export type KitStatus = "pending" | "generating" | "ready" | "failed";

export interface KitDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  jobDescription: string;
  companyUrl: string;
  daysAvailable: number;
  dedupeKey: string;
  status: KitStatus;
  progress: { step: string; message: string; at: Date }[];
  error: { code: string; message: string } | null;
  kit: Record<string, unknown> | null;
  itemState: Record<string, ItemSource>;
  practice: { cardId: string; confidence: number; reviewedAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const kitSchema = new Schema<KitDocument>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  jobDescription: { type: String, required: true },
  companyUrl: { type: String, required: true },
  daysAvailable: { type: Number, required: true },
  dedupeKey: { type: String, required: true, index: true },
  status: { type: String, enum: ["pending", "generating", "ready", "failed"], default: "pending" },
  progress: [{ step: String, message: String, at: { type: Date, default: () => new Date() } }],
  error: { type: Schema.Types.Mixed, default: null },
  kit: { type: Schema.Types.Mixed, default: null },
  itemState: { type: Schema.Types.Mixed, default: {} },
  practice: [
    {
      cardId: String,
      confidence: Number,
      reviewedAt: { type: Date, default: () => new Date() },
    },
  ],
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
});

kitSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

export function computeDedupeKey(userId: string, jobDescription: string, companyUrl: string): string {
  const normalized = `${userId}::${jobDescription.trim().toLowerCase()}::${companyUrl.trim().toLowerCase()}`;
  return createHash("sha256").update(normalized).digest("hex");
}

export const KitModel = mongoose.model<KitDocument>("Kit", kitSchema);
