"use server"

import { bucket } from "@/lib/gcs"

export async function listFilesAction(prefix: string) {
  try {
    const [files] = await bucket.getFiles({ prefix: `${prefix}/` })
    
    return files.map(file => ({
      name: file.name.replace(`${prefix}/`, ''),
      id: file.id,
      created_at: file.metadata.timeCreated || new Date().toISOString(),
      metadata: {
        size: parseInt(file.metadata.size as string) || 0,
        mimetype: file.metadata.contentType || 'application/octet-stream'
      }
    })).filter(f => f.name.length > 0) // filter out the folder object if it exists
  } catch (error) {
    console.error("List files error:", error)
    throw new Error((error instanceof Error ? error.message : String(error)))
  }
}

export async function getFileUrlAction(path: string) {
  try {
    // Generate a signed URL for reading
    const file = bucket.file(path)
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    })
    return { publicUrl: url }
  } catch (error) {
    console.error("Get file URL error:", error)
    throw new Error((error instanceof Error ? error.message : String(error)))
  }
}

export async function uploadFileAction(formData: FormData) {
  try {
    const file = formData.get('file') as File
    const path = formData.get('path') as string
    if (!file || !path) throw new Error("Missing file or path")

    const buffer = Buffer.from(await file.arrayBuffer())
    const gcsFile = bucket.file(path)
    
    await gcsFile.save(buffer, {
      contentType: file.type,
      resumable: false
    })

    return { success: true }
  } catch (error) {
    console.error("Upload file error:", error)
    throw new Error((error instanceof Error ? error.message : String(error)))
  }
}
