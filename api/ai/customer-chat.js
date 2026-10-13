import { handleAiRequest } from '../_lib/ai.js';

export default async function handler(req, res) {
  return handleAiRequest(req, res, 'customer');
}
