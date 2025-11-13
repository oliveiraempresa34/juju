import React from 'react';
import { useAuthStore } from '../store/useAuth';

export const SimpleWalletPanel: React.FC = () => {
  const { user, wallet } = useAuthStore();

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="stack">
      {/* Balance Overview */}
      <div className="panel-tonal">
        <h2 style={{ margin: '0 0 24px 0', color: 'var(--color-text-primary)' }}>
          💰 Carteira
        </h2>

        <div className="metric" style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="metric__value" style={{ fontSize: '2.5rem' }}>
            {formatCurrency(wallet?.balance || 0)}
          </div>
          <div className="metric__label">Saldo Atual</div>
        </div>

        <div style={{ display: 'grid', gap: '16px', maxWidth: '400px', margin: '0 auto' }}>
          <button className="button-cta" onClick={() => alert('Sistema de depósito em manutenção')}>
            💳 Depositar via PIX
          </button>

          <button className="button-secondary" disabled>
            🏦 Sacar (Em breve)
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="panel-tonal">
        <h3 style={{ margin: '0 0 24px 0', color: 'var(--color-text-primary)' }}>
          📊 Histórico de Transações
        </h3>

        {wallet?.transactions && wallet.transactions.length > 0 ? (
          <div className="list-glow">
            {wallet.transactions.map((transaction, index) => (
              <div key={transaction.id || index} className="list-glow__item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '1.5rem' }}>
                    💰
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                      {transaction.description || transaction.type}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      {new Date(transaction.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontWeight: '700',
                        color: transaction.amount >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                        fontSize: '1.1rem'
                      }}
                    >
                      {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </div>
                    <div className="badge-chip">
                      {transaction.status === 'completed' ? '✅ Concluído' : '⏳ Pendente'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
            <p>Nenhuma transação ainda</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Faça seu primeiro depósito para começar a jogar!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};