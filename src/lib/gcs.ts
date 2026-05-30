import { Storage } from '@google-cloud/storage';

if (!process.env.GCP_PROJECT_ID) {
  throw new Error("GCP_PROJECT_ID is not defined in environment variables.");
}
if (!process.env.GCP_STORAGE_BUCKET) {
  throw new Error("GCP_STORAGE_BUCKET is not defined in environment variables.");
}

export const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
});

export const bucketName = process.env.GCP_STORAGE_BUCKET;
export const bucket = storage.bucket(bucketName);
