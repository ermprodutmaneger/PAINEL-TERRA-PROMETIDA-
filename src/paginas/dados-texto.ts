/* Textos prontos para WhatsApp — usados nos atalhos de §8.4 e §8.5. */

export function mensagemCatalogo(nome: string): string {
  return `Olá, ${nome}! 👋

Sou da *Terra Prometida Express* — temperos e condimentos para cozinhas comerciais, padarias, lanchonetes e marmitarias.

📦 *Catálogo em destaque*
• Pimenta-do-reino moída 500g — R$ 11,90
• Pimenta-do-reino em grãos 1kg — R$ 22,50
• Tempero completo 1kg — R$ 34,90
• Páprica defumada 500g — R$ 11,90
• Canela em pó 500g — R$ 19,90
• Alho em pó 500g — R$ 29,90

✅ Entrega rápida na sua região
✅ Pedido mínimo a partir de R$ 150,00

Posso montar um orçamento sob medida para você?`;
}

export function mensagemOrcamento(cliente: string, numero: string, total: string, entrega: string): string {
  return `Olá, ${cliente}! 👋

Acabei de registrar o pedido *${numero}* no valor de *${total}* na Terra Prometida Express.

📅 Previsão de entrega: ${entrega}

Qualquer ajuste, é só me chamar por aqui. Bom apetite!`;
}

export function mensagemRetomada(cliente: string, dias: number): string {
  return `Olá, ${cliente}! Tudo bem? 😊

Percebi que faz ${dias} dias que a gente não fecha pedido. Está faltando alguma coisa no seu tempero? Consigo montar uma proposta com os SKUs que você costuma levar.`;
}
