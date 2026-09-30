import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* =============================== Identificadores ========================== */

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function agora(): string {
  return new Date().toISOString();
}

/* ================================== Moeda ================================ */

const fmtMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtMoedaCurta = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function moeda(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return fmtMoeda.format(0);
  return fmtMoeda.format(v);
}

/** Versão compacta para eixos de gráfico e números de destaque (R$ 12,4 mil). */
export function moedaCompacta(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return 'R$ 0';
  if (Math.abs(v) < 1000) return fmtMoeda.format(v);
  return fmtMoedaCurta.format(v);
}

/** Valor para campos de formulário: aceita "1.234,56", "1234.56" ou número. */
export function paraNumero(entrada: string | number): number {
  if (typeof entrada === 'number') return Number.isFinite(entrada) ? entrada : 0;
  const limpo = entrada.replace(/[^\d,.-]/g, '');
  if (!limpo) return 0;
  // Se tem vírgula, ela é o separador decimal (padrão pt-BR).
  if (limpo.includes(',')) return Number(limpo.replace(/\./g, '').replace(',', '.')) || 0;
  return Number(limpo) || 0;
}

/** Número para exibição em campo de texto (sem símbolo de moeda). */
/** Valor para <input type="number">: sempre com ponto decimal (exigência do HTML). */
export function numeroParaInput(v: number | null | undefined, casas = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '';
  return v.toFixed(casas);
}

export function numeroParaCampo(v: number | null | undefined, casas = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function numero(v: number | null | undefined, casas = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '0';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function percentual(v: number | null | undefined, casas = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '0%';
  return `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

export function percentualNum(v: number, casas = 1): string {
  if (!Number.isFinite(v)) return '0%';
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

export function sinal(v: number): string {
  return `${v > 0 ? '+' : ''}${percentualNum(v)}`;
}

/* ================================== Datas ================================ */

/** Datas trafegam sempre como ISO `yyyy-MM-dd`; a UI mostra dd/mm/aaaa. */
export function hojeISO(): string {
  const d = new Date();
  return toISO(d);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

export function deISO(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function dataBR(iso: string | undefined | null): string {
  const d = deISO(iso);
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function dataCurtaBR(iso: string | undefined | null): string {
  const d = deISO(iso);
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function dataHoraBR(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function diasEntre(deISO_: string, ateISO: string): number {
  const a = deISO(deISO_);
  const b = deISO(ateISO);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function somaDias(iso: string, dias: number): string {
  const d = deISO(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + dias);
  return toISO(d);
}

export const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const MESES_CURTOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

export function rotuloMes(mes: number, ano: number, curto = false): string {
  return `${curto ? MESES_CURTOS[mes - 1] : MESES[mes - 1]}/${String(ano).slice(2)}`;
}

export function rotuloMesLongo(mes: number, ano: number): string {
  return `${MESES[mes - 1]} de ${ano}`;
}

/* ================================ Texto ================================== */

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

export function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function mascararCnpj(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}/${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}/${d.slice(5, 8)}-${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}/${d.slice(5, 8)}-${d.slice(8, 12)}-${d.slice(12)}`;
}

export function mascararTelefone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascararCep(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function linkWhatsapp(telefone: string, mensagem: string): string {
  const numero = telefone.replace(/\D/g, '');
  return `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;
}

export function maiuscula(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function slugTelefone(tel: string): string {
  return linkWhatsapp(tel, '');
}
