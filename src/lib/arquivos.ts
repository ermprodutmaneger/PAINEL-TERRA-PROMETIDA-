/* Exportação e importação de dados — JSON e CSV/XLSX compatível com Excel pt-BR. */

import type { BancoDados } from '@/types';
import { toISO } from './format';

function baixar(nome: string, conteudo: BlobPart, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportarJSON(bd: BancoDados) {
  const conteudo = JSON.stringify(bd, null, 2);
  baixar(`terra-prometida-backup-${toISO(new Date())}.json`, conteudo, 'application/json;charset=utf-8');
}

/* --------------------------------- CSV ----------------------------------- */

/**
 * CSV no padrão brasileiro: separador `;` e BOM UTF-8, que é o que o Excel
 * em português abre corretamente (aceita ; e o decimal com vírgula).
 */
export function montarCSV(cabecalho: string[], linhas: Array<Array<string | number | null | undefined>>): string {
  const escapar = (v: string | number | null | undefined): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const corpo = [cabecalho, ...linhas].map((l) => l.map(escapar).join(';')).join('\r\n');
  return `﻿${corpo}`;
}

export function exportarCSV(nome: string, cabecalho: string[], linhas: Array<Array<string | number | null | undefined>>) {
  baixar(`${nome}-${toISO(new Date())}.csv`, montarCSV(cabecalho, linhas), 'text/csv;charset=utf-8');
}

/** Converte número para o formato aceito pelo Excel pt-BR (vírgula decimal). */
export function numeroCSV(v: number | null | undefined, casas = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function lerCSV(texto: string): string[][] {
  const semBOM = texto.replace(/^﻿/, '');
  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let dentroDeAspas = false;

  for (let i = 0; i < semBOM.length; i++) {
    const c = semBOM[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (semBOM[i + 1] === '"') {
          campo += '"';
          i++;
        } else dentroDeAspas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') {
      dentroDeAspas = true;
    } else if (c === ';') {
      linha.push(campo);
      campo = '';
    } else if (c === '\n') {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else if (c !== '\r') {
      campo += c;
    }
  }
  if (campo !== '' || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((v) => v.trim() !== ''));
}

export function numeroDoCSV(v: string | undefined): number {
  if (!v) return 0;
  const limpo = v.trim().replace(/[^\d,.-]/g, '');
  if (!limpo) return 0;
  return limpo.includes(',') ? Number(limpo.replace(/\./g, '').replace(',', '.')) || 0 : Number(limpo) || 0;
}

export function escolherArquivo(aceitar: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = aceitar;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

/** Lê uma planilha (CSV ou XLSX) e devolve as linhas como matriz de texto. */
export async function lerPlanilha(arquivo: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(arquivo.name)) {
    const XLSX = await import('xlsx');
    const buffer = await arquivo.arrayBuffer();
    const livro = XLSX.read(buffer, { type: 'array' });
    const folha = livro.Sheets[livro.SheetNames[0]];
    const matriz = XLSX.utils.sheet_to_json<string[]>(folha, { header: 1, raw: false, defval: '' });
    return matriz.filter((l) => l.some((v) => String(v).trim() !== ''));
  }
  return lerCSV(await arquivo.text());
}
