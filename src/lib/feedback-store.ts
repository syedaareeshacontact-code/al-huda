import { randomUUID } from 'node:crypto';

import mongoose, { Schema, type Model } from 'mongoose';

import { connectToMongoDatabase } from '@/lib/db/mongodb';

export type FeedbackCategory = 'bug' | 'feature' | 'content' | 'design' | 'general';

export interface StoredFeedback {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: FeedbackCategory;
  rating: number;
  subject: string;
  message: string;
  pageUrl: string | null;
  status: 'new' | 'reviewed' | 'closed';
  createdAt: string;
  updatedAt: string;
}

const FEEDBACK_COLLECTION = 'feedback';
const FEEDBACK_MODEL_NAME = 'Feedback';

const feedbackSchema = new Schema<StoredFeedback>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ['bug', 'feature', 'content', 'design', 'general'],
      index: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 1200 },
    pageUrl: { type: String, default: null, maxlength: 240 },
    status: { type: String, required: true, enum: ['new', 'reviewed', 'closed'], default: 'new', index: true },
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true },
  },
  {
    collection: FEEDBACK_COLLECTION,
    versionKey: false,
  }
);

function getFeedbackModel(): Model<StoredFeedback> {
  return (
    (mongoose.models[FEEDBACK_MODEL_NAME] as Model<StoredFeedback> | undefined) ??
    mongoose.model<StoredFeedback>(FEEDBACK_MODEL_NAME, feedbackSchema)
  );
}

async function ensureFeedbackModel() {
  await connectToMongoDatabase();
  return getFeedbackModel();
}

export async function createFeedback(input: {
  userId: string;
  userName: string;
  userEmail: string;
  category: FeedbackCategory;
  rating: number;
  subject: string;
  message: string;
  pageUrl?: string | null;
}) {
  const Feedback = await ensureFeedbackModel();
  const nowIso = new Date().toISOString();

  const feedback: StoredFeedback = {
    id: randomUUID(),
    userId: input.userId,
    userName: input.userName.trim(),
    userEmail: input.userEmail.trim().toLowerCase(),
    category: input.category,
    rating: input.rating,
    subject: input.subject.trim(),
    message: input.message.trim(),
    pageUrl: input.pageUrl?.trim() || null,
    status: 'new',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await Feedback.create(feedback);
  return feedback;
}

