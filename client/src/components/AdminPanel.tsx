import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuth';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  balance: number;
  affiliateStats: {
    totalReferrals: number;
    totalCommissions: number;
    level1Referrals: number;
    level2Referrals: number;
  };
}

interface AdminData {
  users: User[];
  totalUsers: number;
  adminUser: string;
}

export const AdminPanel: React.FC = () => {
  const { user } = useAuthStore();
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploadStatus, setLogoUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id && user?.role === 'admin') {
      fetchAdminData();
      fetchCurrentLogo();
    }
  }, [user]);

  const fetchCurrentLogo = async () => {
    try {
      const response = await fetch('/api/settings/');
      if (response.ok) {
        const data = await response.json();
        if (data.settings?.headerLogo) {
          setCurrentLogo(data.settings.headerLogo);
        }
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
    }
  };

  const fetchAdminData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/users/${user.id}/admin/users`);

      if (response.ok) {
        const data = await response.json();
        setAdminData(data);
      } else {
        console.error('Failed to fetch admin data');
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserBalance = async (userId: string, amount: number) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/users/${userId}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          description: `Ajuste administrativo por ${user?.username}`
        }),
      });

      if (response.ok) {
        await fetchAdminData(); // Refresh data
        setSelectedUser(null);
      } else {
        console.error('Failed to update balance');
      }
    } catch (error) {
      console.error('Error updating balance:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (PNG, JPEG, WebP)
    if (!file.type.includes('png') && !file.type.includes('jpeg') && !file.type.includes('jpg') && !file.type.includes('webp')) {
      alert('Apenas arquivos PNG, JPEG ou WebP são permitidos');
      return;
    }

    // Validate file size (max 2.5MB)
    if (file.size > 2.5 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 2.5MB');
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !user?.id) return;

    try {
      setLogoUploadStatus('uploading');

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;

        const response = await fetch(`/api/settings/${user.id}/logo`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logoDataUrl: base64 }),
        });

        if (response.ok) {
          setLogoUploadStatus('success');
          setCurrentLogo(base64);
          setLogoFile(null);
          setLogoPreview(null);
          setTimeout(() => setLogoUploadStatus('idle'), 2000);
        } else {
          setLogoUploadStatus('error');
          setTimeout(() => setLogoUploadStatus('idle'), 3000);
        }
      };

      reader.readAsDataURL(logoFile);
    } catch (error) {
      console.error('Error uploading logo:', error);
      setLogoUploadStatus('error');
      setTimeout(() => setLogoUploadStatus('idle'), 3000);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="panel-tonal">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ marginBottom: '16px' }}>🚫</div>
          <h3>Acesso Negado</h3>
          <p>Apenas administradores podem acessar esta área.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="panel-tonal">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ marginBottom: '16px' }}>🔄</div>
          <p>Carregando dados administrativos...</p>
        </div>
      </div>
    );
  }

  if (!adminData) {
    return (
      <div className="panel-tonal">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ marginBottom: '16px' }}>❌</div>
          <p>Erro ao carregar dados administrativos</p>
        </div>
      </div>
    );
  }

  const totalBalance = adminData.users.reduce((sum, u) => sum + u.balance, 0);
  const totalCommissions = adminData.users.reduce((sum, u) => sum + u.affiliateStats.totalCommissions, 0);
  const totalReferrals = adminData.users.reduce((sum, u) => sum + u.affiliateStats.totalReferrals, 0);

  return (
    <div className="stack">
      {/* Admin Header */}
      <div className="panel-tonal">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            🛠️ Painel Administrativo
          </h2>
          <p style={{ margin: '8px 0 0 0', color: 'var(--color-text-secondary)' }}>
            Bem-vindo, <strong>{adminData.adminUser}</strong>
          </p>
        </div>

        {/* System Stats */}
        <div className="card-grid">
          <div className="metric">
            <div className="metric__value">{adminData.totalUsers}</div>
            <div className="metric__label">Total Usuários</div>
          </div>
          <div className="metric">
            <div className="metric__value">{formatCurrency(totalBalance)}</div>
            <div className="metric__label">Saldo Total</div>
          </div>
          <div className="metric">
            <div className="metric__value">{totalReferrals}</div>
            <div className="metric__label">Total Indicações</div>
          </div>
          <div className="metric">
            <div className="metric__value">{formatCurrency(totalCommissions)}</div>
            <div className="metric__label">Comissões Pagas</div>
          </div>
        </div>
      </div>

      {/* Users Management */}
      <div className="panel-tonal">
        <div className="ui-card__header">
          <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            👥 Gerenciamento de Usuários
          </h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)' }}>
            Gerencie contas de usuários e saldos
          </p>
        </div>

        <div className="table-card">
          <div className="table-row table-row--header">
            <div>Usuário</div>
            <div>Saldo</div>
            <div>Indicações</div>
            <div>Ações</div>
          </div>

          {adminData.users.map((userData) => (
            <div key={userData.id} className="table-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="medallion medallion--muted">
                  {userData.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                    {userData.username}
                    {userData.role === 'admin' && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '0.75rem',
                        backgroundColor: 'var(--color-warning)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '999px'
                      }}>
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    {userData.email}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Registrado: {formatDate(userData.createdAt)}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                  {formatCurrency(userData.balance)}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  Comissões: {formatCurrency(userData.affiliateStats.totalCommissions)}
                </div>
              </div>

              <div>
                <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                  {userData.affiliateStats.totalReferrals}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  L1: {userData.affiliateStats.level1Referrals} | L2: {userData.affiliateStats.level2Referrals}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="button-secondary"
                  onClick={() => setSelectedUser(userData)}
                  style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                >
                  Editar Saldo
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Balance Modal */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(11, 15, 20, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="ui-card" style={{ width: '100%', maxWidth: '400px' }}>
            <div className="ui-card__header">
              <h3 style={{ margin: 0 }}>Editar Saldo</h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)' }}>
                Usuário: <strong>{selectedUser.username}</strong>
              </p>
              <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)' }}>
                Saldo atual: <strong>{formatCurrency(selectedUser.balance)}</strong>
              </p>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  className="button-secondary button-secondary--success"
                  onClick={() => updateUserBalance(selectedUser.id, 10)}
                  disabled={actionLoading}
                >
                  +R$ 10
                </button>
                <button
                  className="button-secondary button-secondary--success"
                  onClick={() => updateUserBalance(selectedUser.id, 50)}
                  disabled={actionLoading}
                >
                  +R$ 50
                </button>
                <button
                  className="button-secondary button-secondary--success"
                  onClick={() => updateUserBalance(selectedUser.id, 100)}
                  disabled={actionLoading}
                >
                  +R$ 100
                </button>
                <button
                  className="button-secondary button-secondary--danger"
                  onClick={() => updateUserBalance(selectedUser.id, -selectedUser.balance)}
                  disabled={actionLoading}
                >
                  Zerar Saldo
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="button-secondary"
                  onClick={() => setSelectedUser(null)}
                  disabled={actionLoading}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
              </div>
            </div>

            {actionLoading && (
              <div style={{ textAlign: 'center', marginTop: '16px', color: 'var(--color-text-secondary)' }}>
                Processando...
              </div>
            )}
          </div>
        </div>
      )}

      {/* System Actions */}
      <div className="panel-tonal">
        <div className="ui-card__header">
          <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            ⚙️ Ações do Sistema
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <button
            className="button-secondary"
            onClick={fetchAdminData}
            disabled={loading}
          >
            🔄 Atualizar Dados
          </button>

          <button
            className="button-secondary"
            onClick={() => {
              const csvContent = `Username,Email,Balance,Referrals,Commissions,Created\n${
                adminData.users.map(u =>
                  `${u.username},${u.email},${u.balance},${u.affiliateStats.totalReferrals},${u.affiliateStats.totalCommissions},${u.createdAt}`
                ).join('\n')
              }`;
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
            }}
          >
            📊 Exportar CSV
          </button>

          <div className="badge-soft" style={{ textAlign: 'center', padding: '12px' }}>
            Sistema Online ✅
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="panel-tonal">
        <div className="ui-card__header">
          <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            🖼️ Logo do Site
          </h3>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)' }}>
            Enviar logo PNG, JPEG ou WebP (1200x300px, máx 2.5MB)
          </p>
        </div>

        {currentLogo && !logoPreview && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              Logo atual:
            </p>
            <img
              src={currentLogo}
              alt="Logo atual"
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '8px',
                border: '1px solid rgba(34, 48, 86, 0.5)'
              }}
            />
          </div>
        )}

        {logoPreview && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              Preview:
            </p>
            <img
              src={logoPreview}
              alt="Preview do logo"
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '8px',
                border: '1px solid rgba(110, 139, 255, 0.5)'
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleLogoFileChange}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid rgba(34, 48, 86, 0.5)',
              backgroundColor: 'rgba(17, 23, 35, 0.5)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer'
            }}
          />

          {logoFile && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="button-secondary button-secondary--success"
                onClick={handleLogoUpload}
                disabled={logoUploadStatus === 'uploading'}
                style={{ flex: 1 }}
              >
                {logoUploadStatus === 'uploading' ? '⏳ Enviando...' : '✓ Confirmar Upload'}
              </button>
              <button
                className="button-secondary"
                onClick={() => {
                  setLogoFile(null);
                  setLogoPreview(null);
                }}
                disabled={logoUploadStatus === 'uploading'}
                style={{ flex: 1 }}
              >
                ✗ Cancelar
              </button>
            </div>
          )}

          {logoUploadStatus === 'success' && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 214, 180, 0.1)',
              border: '1px solid rgba(59, 214, 180, 0.3)',
              color: 'var(--color-success)',
              textAlign: 'center'
            }}>
              ✓ Logo atualizado com sucesso!
            </div>
          )}

          {logoUploadStatus === 'error' && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 82, 82, 0.1)',
              border: '1px solid rgba(255, 82, 82, 0.3)',
              color: 'var(--color-error)',
              textAlign: 'center'
            }}>
              ✗ Erro ao enviar logo. Tente novamente.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};