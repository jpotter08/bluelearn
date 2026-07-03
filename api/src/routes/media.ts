import { Hono } from 'hono'
import { requireUser } from '../middleware/auth.middleware'
import type { HonoEnv } from '../types'
import { type FileUpload } from '@bluelearn/schemas'

import { uploadMediaFile, addMediaRevision } from '../services/media.service'

export const mediaRouter = new Hono<HonoEnv>()
  // Upload a file to object storage and store entry in database
  .post('/upload', requireUser, async (c) => {
    const userId = c.get('user').id
    const body = await c.req.formData()
    const file = body.get('file') as FileUpload
    const revisionId = body.get('revision_id') as string | null

    if (!revisionId)
      return c.json({ error: 'Missing revision_id' }, 500)

    const supabase = c.get('supabase')
    const mediaAsset = await uploadMediaFile(file, userId, supabase)

    // Add to revision history
    const revision = await addMediaRevision(revisionId, mediaAsset.id, supabase)

    return c.json({ media: mediaAsset, revision }, 201)
  })
