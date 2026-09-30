/* Validações auxiliares em português, usadas pelos formulários. */

export function validarCnpj(valor: string): boolean {
  const d = valor.replace(/\D/g, '');
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;

  const calc = (base: number[], pesos: number[]) => {
    const soma = base.reduce((acc, n, i) => acc + n * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = calc([...d.slice(0, 12)].map(Number), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc([...d.slice(0, 13)].map(Number), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(d[12]) && d2 === Number(d[13]);
}

export function validarTelefone(valor: string): boolean {
  const d = valor.replace(/\D/g, '');
  return d.length >= 10 && d.length <= 11;
}

export function validarEmail(valor: string): boolean {
  return /\S+@\S+\.\S+/.test(valor);
}

/** Máscara progressiva para campos de texto (telefone, CEP, CNPJ). */
export function mascaraDinamica(valor: string, tipo: 'telefone' | 'cep' | 'cnpj'): string {
  const d = valor.replace(/\D/g, '');
  if (tipo === 'cep') {
    return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5, 8)}`;
  }
  if (tipo === 'cnpj') {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}/${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}/${d.slice(5, 8)}-${d.slice(8)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}/${d.slice(5, 8)}-${d.slice(8, 12)}-${d.slice(12)}`;
  }
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
