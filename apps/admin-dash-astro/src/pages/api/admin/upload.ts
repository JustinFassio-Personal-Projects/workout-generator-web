/**
 * Admin upload API for blog featured images.
 * Accepts FormData with file; uploads to blog-images bucket.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET = 'blog-images';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    await verifyAdminRequest(request, cookies);

    const formData = await request.formData();
    const entry = formData.get('file');
    if (!entry || !(entry instanceof File)) {
      return json({ error: 'No file provided' }, 400);
    }
    const file = entry;

    if (!ALLOWED_TYPES.includes(file.type)) {
      return json({ error: 'Invalid file type. Allowed: jpg, png, webp, gif' }, 400);
    }

    if (file.size > MAX_SIZE) {
      return json({ error: 'File too large. Maximum size: 5MB' }, 400);
    }

    const ext = file.name.split('.').pop() || 'bin';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}-${randomId}.${ext}`;
    const path = `blog/${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = getSupabaseServer();
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
      cacheControl: '31536000',
    });

    if (error) {
      console.error('[admin/upload] Upload error:', error);
      return json({ error: error.message }, 500);
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return json({ url: urlData.publicUrl, filename });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED' || error.message === 'UNAUTHORIZED') {
        return json({ error: 'Unauthorized. Admin access required.' }, 401);
      }
    }
    console.error('[admin/upload] Error:', error);
    return json({ error: 'Upload failed' }, 500);
  }
};
