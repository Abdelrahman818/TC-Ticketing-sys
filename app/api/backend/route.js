import serverless from 'serverless-http';
import app from '@backend/app.js';

const handler = serverless(app, {
  request: {
    uri: true,
  },
});

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
