import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/useAuth';
import { Footer } from './Footer';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const ProfilePanel: React.FC = () => {
  const { user, wallet, updateWithdrawAddress, logout } = useAuthStore();
  const [withdrawAddress, setWithdrawAddress] = useState(user?.withdrawAddress ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setWithdrawAddress(user?.withdrawAddress ?? '');
  }, [user?.withdrawAddress]);

  const walletStats = useMemo(() => {
    if (!wallet) {
      return {
        totalTransactions: 0,
        deposits: 0,
        withdrawals: 0,
        rewards: 0,
      };
    }

    const transactions = wallet.transactions || [];
    return transactions.reduce(
      (acc, transaction) => {
        acc.totalTransactions += 1;
        if (transaction.type === 'deposit') {
          acc.deposits += 1;
        }
        if (transaction.type === 'withdrawal') {
          acc.withdrawals += 1;
        }
        if (transaction.type === 'game-reward') {
          acc.rewards += 1;
        }
        return acc;
      },
      {
        totalTransactions: 0,
        deposits: 0,
        withdrawals: 0,
        rewards: 0,
      }
    );
  }, [wallet]);

  const handleSave = async () => {
    if (!user) {
      return;
    }

    const trimmed = withdrawAddress.trim();
    setStatus('saving');
    setErrorMessage(null);

    try {
      await updateWithdrawAddress(trimmed);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao atualizar chave PIX');
    }
  };


  if (!user) {
    return null;
  }

  return (
    <>
      <div className="panel-tonal">
        <div className="profile-card__header" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="stack" style={{ gap: '6px' }}>
            <h2 style={{ margin: 0, color: 'var(--color-text-primary)' }}>👤 Perfil do Jogador</h2>
            <span className="text-secondary">Gerencie seus dados e acompanhe seu histórico.</span>
          </div>
          <button className="button-secondary" onClick={logout}>
            Sair da conta
          </button>
        </div>

        <div className="profile-card__meta" style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>
          <div className="stack" style={{ gap: '6px' }}>
            <span className="ui-label-muted">Usuário</span>
            <div className="field-block">{user.username}</div>
          </div>
          <div className="stack" style={{ gap: '6px' }}>
            <span className="ui-label-muted">Email</span>
            <div className="field-block">{user.email}</div>
          </div>
          <div className="stack" style={{ gap: '6px' }}>
            <span className="ui-label-muted">Função</span>
            <div className="field-block">{user.role === 'admin' ? 'Administrador' : 'Jogador'}</div>
          </div>
          <div className="stack" style={{ gap: '6px' }}>
            <span className="ui-label-muted">Saldo atual</span>
            <div className="field-block field-block--highlight">
              {formatCurrency(wallet?.balance ?? 0)}
            </div>
          </div>
        </div>

        <div className="divider-soft" style={{ margin: '24px 0' }} />

        <div className="stack" style={{ gap: '12px' }}>
        <label htmlFor="withdraw-address" className="ui-label-muted">
          Chave PIX para saques
        </label>
        <input
          id="withdraw-address"
          type="text"
          placeholder="ex: meuemail@provedor.com"
          value={withdrawAddress}
          onChange={(event) => setWithdrawAddress(event.target.value)}
        />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="button-secondary"
            onClick={handleSave}
            disabled={status === 'saving'}
          >
            {status === 'saving' ? 'Salvando...' : 'Salvar chave PIX'}
          </button>
          {status === 'success' && (
            <span className="text-secondary" style={{ color: 'var(--color-success)' }}>
              Chave PIX atualizada com sucesso
            </span>
          )}
          {status === 'error' && (
            <span className="text-secondary" style={{ color: 'var(--color-danger)' }}>
              {errorMessage || 'Não foi possível salvar a chave PIX'}
            </span>
          )}
        </div>
        </div>

        <div className="divider-soft" style={{ margin: '24px 0' }} />

        <div className="stack" style={{ gap: '12px' }}>
          <div className="ui-label-muted">Visão geral</div>
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <div className="panel-tonal panel-tonal--subtle metric" style={{ alignItems: 'center', gap: '6px' }}>
              <span className="metric__value">{walletStats.totalTransactions}</span>
              <span className="metric__label">Transações</span>
            </div>
            <div className="panel-tonal panel-tonal--subtle metric" style={{ alignItems: 'center', gap: '6px' }}>
              <span className="metric__value">{walletStats.deposits}</span>
              <span className="metric__label">Depósitos</span>
            </div>
            <div className="panel-tonal panel-tonal--subtle metric" style={{ alignItems: 'center', gap: '6px' }}>
              <span className="metric__value">{walletStats.withdrawals}</span>
              <span className="metric__label">Solicitações de saque</span>
            </div>
            <div className="panel-tonal panel-tonal--subtle metric" style={{ alignItems: 'center', gap: '6px' }}>
              <span className="metric__value">{walletStats.rewards}</span>
              <span className="metric__label">Prêmios recebidos</span>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};
