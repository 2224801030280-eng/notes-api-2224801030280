const { createClient } = require('@supabase/supabase-js');

let client;
function bucket() {
  if (!client) {
    const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const key = (process.env.SUPABASE_SERVICE_KEY || '').trim();
    if (!url || !key) {
      throw new Error('Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_SERVICE_KEY');
    }
    client = createClient(url, key);
  }
  return client.storage.from('attachments');
}

module.exports = { bucket };
