"use server"

import { db } from "@/db/client"
import { company_settings } from "@/db/schema"
import { unstable_cache, revalidateTag } from "next/cache"
import { Storage } from '@google-cloud/storage'

export const getGlobalBranding = unstable_cache(
  async () => {
    try {
      const settings = await db.select().from(company_settings).limit(1)
      if (settings && settings.length > 0) {
        return settings[0]
      }
      return null
    } catch (error) {
      console.error("Failed to fetch global branding:", error)
      return null
    }
  },
  ['global-branding-settings'],
  { revalidate: 3600, tags: ['branding'] }
)

export async function revalidateBranding() {
  // @ts-ignore: Next.js revalidateTag signature mismatch
  revalidateTag('branding')
}

export async function uploadLogo(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get('logo') as File
    if (!file || file.size === 0) {
      return { success: false, error: 'No file provided' }
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const storage = new Storage()
    const bucketName = process.env.GCS_BUCKET_NAME || 'ops360-public-assets'
    const fileName = `logo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    const bucket = storage.bucket(bucketName)
    const fileRef = bucket.file(fileName)

    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
      public: true
    })

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`

    await db.update(company_settings).set({ logo_url: publicUrl })

    // @ts-ignore: Next.js revalidateTag signature mismatch
    revalidateTag('branding')

    return { success: true, url: publicUrl }
  } catch (error) {
    console.error("GCS UPLOAD ERROR:", error)
    const message = error instanceof Error ? error.message : "Upload failed"
    return { success: false, error: message }
  }
}

