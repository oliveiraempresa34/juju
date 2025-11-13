import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuth';

interface AffiliateStats {
  userId: string;
  totalReferrals: number;
  totalCommissions: number;
  level1Referrals: number;
  level2Referrals: number;
  level1Commissions: number;
  level2Commissions: number;
}

interface ReferralUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  referralCount: number;
}

interface AffiliateData {
  stats: AffiliateStats;
  referralTree: ReferralUser[];
  referralCode: string;
  referralUrl: string;
}

export const AffiliatePanel: React.FC = () => {
  const { user } = useAuthStore();
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchAffiliateData();
    }
  }, [user]);

  const fetchAffiliateData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const baseURL = import.meta.env.PROD ? '' : 'http://localhost:2567';
      const response = await fetch(`${baseURL}/api/users/${user.id}/affiliate`);

      if (response.ok) {
        const data = await response.json();
        setAffiliateData(data);
      } else {
        console.error('Failed to fetch affiliate data', response.status);
        // Set default data if API fails
        setAffiliateData({
          stats: {
            userId: user.id,
            totalReferrals: 0,
            totalCommissions: 0,
            level1Referrals: 0,
            level2Referrals: 0,
            level1Commissions: 0,
            level2Commissions: 0
          },
          referralTree: [],
          referralCode: 'DEMO123',
          referralUrl: `https://driftcash.com?invite=DEMO123`
        });
      }
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralUrl = async () => {
    if (!affiliateData?.referralUrl) return;

    try {
      // Tentar método moderno primeiro
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(affiliateData.referralUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } else {
        // Fallback para navegadores antigos
        const textArea = document.createElement('textarea');
        textArea.value = affiliateData.referralUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand('copy');
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        } catch (fallbackErr) {
          console.error('Fallback copy failed:', fallbackErr);
          alert('Não foi possível copiar. Por favor, copie manualmente: ' + affiliateData.referralUrl);
        }

        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Não foi possível copiar. Por favor, copie manualmente: ' + affiliateData.referralUrl);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="panel-tonal">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ marginBottom: '16px' }}>🔄</div>
          <p>Carregando dados de afiliados...</p>
        </div>
      </div>
    );
  }

  if (!affiliateData) {
    return (
      <div className="panel-tonal">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ marginBottom: '16px' }}>❌</div>
          <p>Erro ao carregar dados de afiliados</p>
        </div>
      </div>
    );
  }

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
            <div className="metric__value">{affiliateData.stats.totalReferrals}</div>
            <div className="metric__label">Total Indicações</div>
          </div>
          <div className="metric">
            <div className="metric__value">{formatCurrency(affiliateData.stats.totalCommissions)}</div>
            <div className="metric__label">Comissões Totais</div>
          </div>
          <div className="metric">
            <div className="metric__value">{affiliateData.stats.level1Referrals}</div>
            <div className="metric__label">Nível 1 (5%)</div>
          </div>
          <div className="metric">
            <div className="metric__value">{affiliateData.stats.level2Referrals}</div>
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
            <div className="field-block" style={{ flex: 1 }}>
              {affiliateData.referralUrl}
            </div>
            <button
              className={`copy-button ${copySuccess ? 'copy-success' : ''}`}
              onClick={copyReferralUrl}
              title="Copiar link"
            >
              {copySuccess ? '✅' : '📋'}
            </button>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(110, 139, 255, 0.1)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              <strong>Seu código:</strong> <span style={{ color: 'var(--color-primary-light)', fontFamily: 'monospace' }}>{affiliateData.referralCode}</span>
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
                {formatCurrency(affiliateData.stats.level1Commissions)}
              </span>
            </div>
            <div className="muted-grid__row">
              <span>Comissões Nível 2 (2%)</span>
              <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>
                {formatCurrency(affiliateData.stats.level2Commissions)}
              </span>
            </div>
            <div className="muted-grid__row" style={{ borderTop: '1px solid rgba(110, 139, 255, 0.3)', paddingTop: '12px' }}>
              <span style={{ fontWeight: '600' }}>Total Acumulado</span>
              <span style={{ color: 'var(--color-primary-light)', fontWeight: '700', fontSize: '1.1rem' }}>
                {formatCurrency(affiliateData.stats.totalCommissions)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Tree */}
      {affiliateData.referralTree.length > 0 && (
        <div className="panel-tonal">
          <div className="ui-card__header">
            <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
              👥 Suas Indicações ({affiliateData.referralTree.length})
            </h3>
          </div>

          <div className="list-glow">
            {affiliateData.referralTree.map((referral) => (
              <div key={referral.id} className="list-glow__item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="medallion medallion--muted">
                    {referral.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                      {referral.username}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      Registrado em {formatDate(referral.createdAt)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="badge-chip">
                    {referral.referralCount} indicações
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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