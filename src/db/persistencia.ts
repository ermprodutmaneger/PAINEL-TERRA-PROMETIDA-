/* Persistência local (IndexedDB). Nada sai do navegador — requisito do
   §12: sem upload para servidor ou nuvem. */

import { get, set, del } from 'idb-keyval';
import type { BancoDados } from '@/types';

const CHAVE = 'terra-prometida-express/banco';

export async function carregarBanco(): Promise<BancoDados | null> {
  try {
    const bruto = await get<BancoDados>(CHAVE);
    return bruto ?? null;
  } catch (erro) {
    console.warn('Não foi possível ler os dados salvos no navegador:', erro);
    return null;
  }
}

export async function salvarBanco(banco: BancoDados): Promise<void> {
  try {
    await set(CHAVE, banco);
  } catch (erro) {
    console.warn('Não foi possível salvar os dados no navegador:', erro);
  }
}

export async function apagarBanco(): Promise<void> {
  await del(CHAVE);
}
