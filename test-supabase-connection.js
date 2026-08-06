// Script para testar a conexão com Supabase
// Execute com: node test-supabase-connection.js

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carrega variáveis do .env
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('\n🔍 Verificando conexão com Supabase...\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERRO: Variáveis de ambiente não encontradas!');
  console.log('   Certifique-se de que o arquivo .env existe e contém:');
  console.log('   - VITE_SUPABASE_URL');
  console.log('   - VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('✅ Variáveis de ambiente carregadas');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key: ${supabaseAnonKey.substring(0, 20)}...`);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('\n📡 Testando conexão...');

try {
  // Tenta fazer uma query simples
  const { data, error } = await supabase.from('profiles').select('count').limit(1);
  
  if (error) {
    console.error('❌ Erro ao conectar:', error.message);
    console.log('\n💡 Possíveis causas:');
    console.log('   - URL ou chave incorretas');
    console.log('   - Tabela "profiles" não existe no banco');
    console.log('   - Políticas RLS bloqueando acesso');
    process.exit(1);
  }
  
  console.log('✅ Conexão estabelecida com sucesso!');
  console.log('✅ Tabela "profiles" acessível');
  console.log('\n🎉 Supabase está conectado e funcionando!\n');
} catch (err) {
  console.error('❌ Erro inesperado:', err.message);
  process.exit(1);
}
