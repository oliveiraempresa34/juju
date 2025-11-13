import React from 'react';
import { useAuthStore } from '../store/useAuth';

export const SimpleAffiliatePanel: React.FC = () => {
  const { user } = useAuthStore();

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const referralCode = user?.id ? `REF_${user.username.toUpperCase()}` : 'REF_DEMO';
  const referralUrl = `${window.location.origin}?invite=${referralCode}`;

  const copyReferralUrl = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      alert('Link copiado!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Não foi possível copiar o link');
    }
  };

  return (
    <div className="stack">
      {/* Header */}
      <div className="panel-tonal">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            🤝 Sistema de Afiliados
          </h2>
          <p style={{ margin: '8px 0 0 0', color: 'var(--color-text-secondary)' }}>
            Ganhe comissões indicando novos jogadores
          </p>
        </div>

        {/* Stats Overview */}
        <div className="card-grid" style={{ marginBottom: '24px' }}>
          <div className="metric">
            <div className="metric__value">0</div>
            <div className="metric__label">Total Indicações</div>
          </div>
          <div className="metric">
            <div className="metric__value">{formatCurrency(0)}</div>
            <div className="metric__label">Comissões Totais</div>
          </div>
          <div className="metric">
            <div className="metric__value">0</div>
            <div className="metric__label">Nível 1 (5%)</div>
          </div>
          <div className="metric">
            <div className="metric__value">0</div>
            <div className="metric__label">Nível 2 (2%)</div>
          </div>
        </div>

        {/* Referral Link */}
        <div className="ui-card ui-card--compact" style={{ marginBottom: '24px' }}>
          <div className="ui-card__header">
            <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
              🔗 Seu Link de Indicação
            </h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Compartilhe este link para ganhar comissões
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="field-block" style={{ flex: 1, padding: '12px', background: 'var(--color-surface-secondary)', borderRadius: '8px' }}>
              {referralUrl}
            </div>
            <button
              className="button-secondary"
              onClick={copyReferralUrl}
              title="Copiar link"
            >
              📋 Copiar
            </button>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(110, 139, 255, 0.1)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              <strong>Seu código:</strong> <span style={{ color: 'var(--color-primary-light)', fontFamily: 'monospace' }}>{referralCode}</span>
            </div>
          </div>
        </div>

        {/* Commission Breakdown */}
        <div className="ui-card ui-card--compact">
          <div className="ui-card__header">
            <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
              💰 Detalhamento de Comissões
            </h3>
          </div>

          <div className="muted-grid">
            <div className="muted-grid__row">
              <span>Comissões Nível 1 (5%)</span>
              <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>
                {formatCurrency(0)}
              </span>
            </div>
            <div className="muted-grid__row">
              <span>Comissões Nível 2 (2%)</span>
              <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>
                {formatCurrency(0)}
              </span>
            </div>
            <div className="muted-grid__row" style={{ borderTop: '1px solid rgba(110, 139, 255, 0.3)', paddingTop: '12px' }}>
              <span style={{ fontWeight: '600' }}>Total Acumulado</span>
              <span style={{ color: 'var(--color-primary-light)', fontWeight: '700', fontSize: '1.1rem' }}>
                {formatCurrency(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="panel-tonal">
        <div className="ui-card__header">
          <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            ❓ Como Funciona
          </h3>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary-base)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: '600',
              flexShrink: 0
            }}>
              1
            </div>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                Compartilhe seu link
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                Envie seu link de indicação para amigos e ganhe quando eles se registrarem
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-success)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: '600',
              flexShrink: 0
            }}>
              2
            </div>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                Ganhe comissões automáticas
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                5% das transações dos usuários que você indicou + 2% das transações dos indicados deles
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-warning)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: '600',
              flexShrink: 0
            }}>
              3
            </div>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                Saque seus ganhos
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                As comissões são creditadas automaticamente na sua carteira
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};