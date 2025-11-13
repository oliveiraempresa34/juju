import React from 'react';
import { Footer } from '../components/Footer';
import { useAppStore } from '../store/useApp';

export const PrivacyPolicy: React.FC = () => {
  const { setScreen } = useAppStore();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-root)' }}>
      <div style={{ padding: '48px 24px', maxWidth: '900px', margin: '0 auto', color: 'var(--color-text-primary)' }}>
        {/* Back Button */}
        <button
          onClick={() => setScreen('login')}
          style={{
            background: 'rgba(65, 105, 225, 0.15)',
            border: '2px solid var(--color-primary-dark)',
            color: 'var(--color-text-primary)',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Voltar
        </button>
      <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '24px', background: 'linear-gradient(135deg, #4169E1 0%, #6E8BFF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Política de Privacidade e Termos de Serviço
      </h1>

      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '48px' }}>
        Última atualização: 02 de outubro de 2025
      </p>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-primary-base)' }}>
          1. Introdução
        </h2>
        <p style={{ lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          Bem-vindo ao Drift Cash. Esta Política de Privacidade e Termos de Serviço descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais ao utilizar nossa plataforma de entretenimento digital.
        </p>
        <p style={{ lineHeight: '1.8', color: 'var(--color-text-secondary)' }}>
          Ao criar uma conta e utilizar nossos serviços, você concorda com os termos descritos neste documento.
        </p>
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-primary-base)' }}>
          2. Natureza do Serviço
        </h2>
        <p style={{ lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          O Drift Cash é uma plataforma de entretenimento digital que oferece:
        </p>
        <ul style={{ lineHeight: '2', marginLeft: '24px', color: 'var(--color-text-secondary)' }}>
          <li>Venda de moedas digitais (Drift Coins) que podem ser adquiridas através de depósito via PIX</li>
          <li>Compra de tickets de partida utilizando Drift Coins</li>
          <li>Participação em partidas competitivas que podem gerar recompensas em Drift Coins</li>
          <li>Possibilidade de revenda de Drift Coins de volta para a plataforma pelo mesmo valor de compra</li>
          <li>Sistema de afiliados com comissões em múltiplos níveis</li>
        </ul>
        <p style={{ lineHeight: '1.8', marginTop: '16px', color: 'var(--color-text-secondary)' }}>
          <strong>Importante:</strong> As Drift Coins são itens digitais virtuais sem valor monetário fora da plataforma. A compra e venda de Drift Coins constitui uma transação de produtos digitais.
        </p>
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-primary-base)' }}>
          3. Restrição de Idade
        </h2>
        <p style={{ lineHeight: '1.8', color: 'var(--color-text-secondary)' }}>
          <strong style={{ color: '#ef4444' }}>PROIBIDO PARA MENORES DE 18 ANOS.</strong> Ao criar uma conta, você declara e garante que possui 18 anos completos ou mais. A utilização da plataforma por menores de idade é estritamente proibida e pode resultar no encerramento imediato da conta sem direito a reembolso.
        </p>
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-primary-base)' }}>
          4. Informações Coletadas
        </h2>
        <p style={{ lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          Coletamos as seguintes informações:
        </p>
        <ul style={{ lineHeight: '2', marginLeft: '24px', color: 'var(--color-text-secondary)' }}>
          <li><strong>Informações de Conta:</strong> Nome de usuário, endereço de e-mail, senha criptografada</li>
          <li><strong>Informações de Pagamento:</strong> Chave PIX para saques, histórico de transações</li>
          <li><strong>Dados de Uso:</strong> Histórico de partidas, estatísticas de jogo, pontuações</li>
          <li><strong>Informações de Afiliados:</strong> Código de indicação, comissões geradas, rede de indicados</li>
          <li><strong>Dados Técnicos:</strong> Endereço IP, tipo de navegador, sistema operacional</li>
        </ul>
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-primary-base)' }}>
          5. Uso de Informações
        </h2>
        <p style={{ lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          Utilizamos suas informações para:
        </p>
        <ul style={{ lineHeight: '2', marginLeft: '24px', color: 'var(--color-text-secondary)' }}>
          <li>Processar transações de compra e venda de Drift Coins</li>
          <li>Gerenciar sua conta e fornecer suporte ao cliente</li>
          <li>Processar pagamentos de saques via PIX</li>
          <li>Calcular e distribuir comissões de afiliados</li>
          <li>Prevenir fraudes e garantir a segurança da plataforma</li>
          <li>Melhorar nossos serviços e experiência do usuário</li>
          <li>Cumprir obrigações legais e regulatórias</li>
        </ul>
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-primary-base)' }}>
          6. Proteção de Dados
        </h2>
        <p style={{ lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações:
        </p>
        <ul style={{ lineHeight: '2', marginLeft: '24px', color: 'var(--color-text-secondary)' }}>
          <li>Criptografia SSL/TLS para todas as transmissões de dados</li>
          <li>Armazenamento seguro de senhas usando bcrypt</li>
          <li>Proteção contra ataques DDoS e tentativas de invasão</li>
          <li>Acesso restrito aos dados apenas para pessoal autorizado</li>
          <li>Backups regulares e redundância de dados</li>
          <li>Certificações de segurança Norton Secured e GeoTrust</li>
        </ul>
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-primary-base)' }}>
          7. Política de Cookies
        </h2>
        <p style={{ lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          Utilizamos cookies e tecnologias similares para:
        </p>
        <ul style={{ lineHeight: '2', marginLeft: '24px', color: 'var(--color-text-secondary)' }}>
          <li><strong>Cookies Essenciais:</strong> Necessários para o funcionamento da plataforma (autenticação, sessão)</li>
          <li><strong>Cookies de Desempenho:</strong> Coletam informações sobre como você usa o site</li>
          <li><strong>Cookies de Funcionalidade:</strong> Lembram suas preferências e configurações</li>
        </ul>
        <p style={{ lineHeight: '1.8', marginTop: '16px', color: 'var(--color-text-secondary)' }}>
          Você pode gerenciar as preferências de cookies através das configurações do seu navegador. Note que desabilitar cookies pode afetar a funcionalidade da plataforma.
        </p>
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-primary-base)' }}>
          8. Transações Financeiras
        </h2>
        <p style={{ lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          <strong>Depósitos:</strong> Todos os depósitos são processados via PIX. Ao adicionar saldo, você está comprando Drift Coins que serão creditadas em sua conta imediatamente após confirmação do pagamento.
        </p>
        <p style={{ lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          <strong>Saques:</strong> Você pode solicitar a venda de suas Drift Coins de volta para a plataforma. Os pagamentos são processados via PIX para a chave cadastrada em até 48 horas úteis.
        </p>
        <p style={{ lineHeight: '1.8', color: 'var(--color-text-secondary)' }}>
          <strong>Taxas:</strong> Não cobramos taxas sobre depósitos ou saques. O valor da Drift Coin é fixo (R$ 1,00 = 1 Drift Coin).
        </p>
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-primary-base)' }}>
          9. Sistema de Afiliados
        </h2>
        <p style={{ lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          Nosso programa de afiliados oferece comissões em dois níveis:
        </p>
        <ul style={{ lineHeight: '2', marginLeft: '24px', color: 'var(--color-text-secondary)' }}>
          <li><strong>Nível 1:</strong> Comissão sobre todas as transações dos usuários que você indicou diretamente</li>
          <li><strong>Nível 2:</strong> Comissão sobre transações dos usuários indicados pelos seus indicados</li>
        </ul>
        <p style={{ lineHeight: '1.8', marginTop: '16px', color: 'var(--color-text-secondary)' }}>
          As comissões são creditadas automaticamente em Drift Coins e podem ser sacadas a qualquer momento.
        </p>
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-primary-base)' }}>
          10. Direitos do Usuário
        </h2>
        <p style={{ lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          De acordo com a LGPD (Lei Geral de Proteção de Dados), você tem direito a:
        </p>
        <ul style={{ lineHeight: '2', marginLeft: '24px', color: 'var(--color-text-secondary)' }}>
          <li>Acessar seus dados pessoais</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
          <li>Solicitar a exclusão de dados desnecessários</li>
          <li>Revogar consentimento para processamento de dados</li>
          <li>Portabilidade de dados para outro provedor de serviços</li>
        </ul>
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-primary-base)' }}>
          11. Condições de Uso
        </h2>
        <p style={{ lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
          Ao usar a plataforma, você concorda em:
        </p>
        <ul style={{ lineHeight: '2', marginLeft: '24px', color: 'var(--color-text-secondary)' }}>
          <li>Fornecer informações verdadeiras e precisas</li>
          <li>Manter a segurança de sua conta e senha</li>
          <li>Não utilizar a plataforma para atividades ilegais</li>
          <li>Não tentar burlar sistemas de segurança ou manipular resultados</li>
          <li>Respeitar outros usuários e funcionários da plataforma</li>
        </ul>
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-primary-base)' }}>
          12. Suspensão e Encerramento
        </h2>
        <p style={{ lineHeight: '1.8', color: 'var(--color-text-secondary)' }}>
          Reservamos o direito de suspender ou encerrar contas que violem estes termos. Em caso de encerramento por violação, o saldo em Drift Coins pode ser confiscado sem direito a reembolso. Você pode solicitar o encerramento de sua conta a qualquer momento, e seu saldo será convertido e pago via PIX.
        </p>
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-primary-base)' }}>
          13. Alterações nos Termos
        </h2>
        <p style={{ lineHeight: '1.8', color: 'var(--color-text-secondary)' }}>
          Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas através de e-mail ou aviso na plataforma. O uso continuado após as alterações constitui aceitação dos novos termos.
        </p>
      </section>

      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-primary-base)' }}>
          14. Contato
        </h2>
        <p style={{ lineHeight: '1.8', color: 'var(--color-text-secondary)' }}>
          Para questões sobre esta política ou exercício de seus direitos, entre em contato através do e-mail: <strong style={{ color: 'var(--color-primary-base)' }}>privacy@driftcash.com</strong>
        </p>
      </section>

        <div style={{ marginTop: '48px', padding: '24px', background: 'rgba(65, 105, 225, 0.1)', borderRadius: '12px', border: '1px solid var(--color-primary-dark)' }}>
          <p style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--color-text-secondary)', margin: 0 }}>
            Ao utilizar o Drift Cash, você reconhece ter lido, compreendido e concordado com todos os termos descritos nesta Política de Privacidade e Termos de Serviço.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};
