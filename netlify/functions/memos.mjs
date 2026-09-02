import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const store = getStore('memo-submissions');
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function authorized(request) {
  const key = process.env.ADMIN_KEY;
  return Boolean(key) && request.headers.get('x-admin-key') === key;
}

export default async (request) => {
  try {
    if (request.method === 'POST') {
      const data = await request.json().catch(() => null);
      const values = [data?.answer1, data?.answer2, data?.answer3, data?.answer4]
        .map(value => String(value ?? '').trim());

      if (values.some(value => !value)) {
        return response({ message: 'Please complete all fields.' }, 400);
      }

      if (values[0].length > 300 || values[1].length > 300 || values[2].length > 500 || values[3].length > 5000) {
        return response({ message: 'One or more answers are too long.' }, 400);
      }

      const id = crypto.randomUUID();
      await store.setJSON(id, {
        id,
        answer1: values[0],
        answer2: values[1],
        answer3: values[2],
        answer4: values[3],
        createdAt: new Date().toISOString()
      });

      return response({ success: true });
    }

    if (!authorized(request)) {
      return response({ message: 'Unauthorized.' }, 401);
    }

    if (request.method === 'GET') {
      const { blobs } = await store.list();
      const submissions = [];

      for (const blob of blobs) {
        const item = await store.get(blob.key, { type: 'json' });
        if (item) submissions.push(item);
      }

      submissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return response(submissions);
    }

    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
        return response({ message: 'A valid submission ID is required.' }, 400);
      }

      await store.delete(id);
      return response({ success: true });
    }

    return response({ message: 'Method not allowed.' }, 405);
  } catch (error) {
    console.error('MEMO function error:', error);
    return response({ message: 'Server error. Please try again.' }, 500);
  }
};

export const config = {
  path: '/api/memos'
};
