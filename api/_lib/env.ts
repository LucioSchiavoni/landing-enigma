const read = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
};

export const env = {
  get supabaseUrl() {
    return read('SUPABASE_URL').replace(/\/+$/, '');
  },
  get serviceKey() {
    return read('SUPABASE_SERVICE_ROLE_KEY');
  },
  get adminSecret() {
    return read('ADMIN_SECRET');
  },
  get appKey() {
    const key = Buffer.from(read('APP_KEY'), 'base64');
    if (key.length !== 32) throw new Error('APP_KEY debe ser de 32 bytes en base64');
    return key;
  },
};
