import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: 'Como funciona o jogo?',
    answer: 'Drift cash é um jogo de corrida multiplayer onde você compete com outros jogadores para percorrer a maior distância sem sair da pista. Clique e segure na tela para fazer curvas - lado esquerdo vira à esquerda, lado direito vira à direita. Quanto mais tempo segurar, mais fechada a curva.'
  },
  {
    question: 'Como faço um depósito?',
    answer: 'Vá até a aba "Carteira" no menu principal, digite o valor desejado (mínimo R$10,00) e clique em "Gerar PIX". Um QR Code será exibido com 5 minutos de validade. Após o pagamento, seu saldo será atualizado automaticamente.'
  },
  {
    question: 'Como funciona o saque?',
    answer: 'Na aba "Perfil", cadastre sua chave PIX. Depois, na aba "Carteira", digite o valor que deseja sacar e clique em "Solicitar Saque". O pagamento será processado em até 24 horas úteis.'
  },
  {
    question: 'O que são salas privadas?',
    answer: 'Salas privadas permitem jogar apenas com amigos. Ao criar uma sala privada, você receberá um código de 6 dígitos para compartilhar. Seus amigos podem usar esse código para entrar na mesma partida. O valor da aposta é definido por quem cria a sala.'
  },
  {
    question: 'Como funcionam os afiliados?',
    answer: 'Compartilhe seu código de afiliado com amigos. Quando eles se cadastrarem usando seu código e fizerem depósitos ou apostas, você ganha comissões automáticas. Acompanhe seus ganhos e afiliados ativos na aba "Afiliados".'
  }
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="panel-tonal" style={{ marginTop: '24px' }}>
      <h3 style={{
        margin: '0 0 16px 0',
        color: 'var(--color-text-primary)',
        fontSize: '1.2rem',
        fontWeight: '600'
      }}>
        ❓ Dúvidas Frequentes
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {faqData.map((item, index) => (
          <div
            key={index}
            style={{
              border: '1px solid rgba(147, 51, 234, 0.3)',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: 'rgba(17, 23, 35, 0.5)'
            }}
          >
            <button
              onClick={() => toggleFAQ(index)}
              style={{
                width: '100%',
                padding: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-primary)',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(147, 51, 234, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>{item.question}</span>
              <span style={{
                fontSize: '1.2rem',
                transition: 'transform 0.3s',
                transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)'
              }}>
                ▼
              </span>
            </button>
            {openIndex === index && (
              <div
                style={{
                  padding: '0 16px 16px 16px',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  animation: 'fadeIn 0.3s ease-in-out'
                }}
              >
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
