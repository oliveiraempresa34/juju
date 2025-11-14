import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuth';
import { useAppStore } from '../store/useApp';
import { LogoHeader } from '../components/LogoHeader';
import { Footer } from '../components/Footer';
import { FlagIcon, PartyIcon, WarningIcon, GamepadIcon, WalletIcon, TrophyIcon, BoltIcon, EyeIcon, EyeOffIcon, WandIcon } from '../components/icons/Icons';
import { FAQSection } from '../components/FAQSection';
import { GalaxyBackground } from '../components/GalaxyBackground';
import { generateRacingUsername, generateRacingEmail } from '../utils/usernameGenerator';
import { Glass, GlassButton } from '../components/Glass';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
  });
  const [inviteFromLink, setInviteFromLink] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { login, register, isLoading, error, isAuthenticated, clearError, setError } = useAuthStore();
  const { setScreen } = useAppStore();

  useEffect(() => {
    if (isAuthenticated) {
      setScreen('lobby');
    }
  }, [isAuthenticated, setScreen]);

  const handleGenerateUsername = () => {
    const newUsername = generateRacingUsername();
    setFormData({ ...formData, username: newUsername });
  };

  const handleGenerateEmail = () => {
    const newEmail = generateRacingEmail(formData.username || undefined);
    setFormData({ ...formData, email: newEmail });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isLogin) {
      await login({
        username: formData.username.trim(),
        password: formData.password,
      });
      return;
    }

    // Validações de registro
    if (formData.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    await register({
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
      referralCode: formData.referralCode || undefined,
    });
  };

  const handleModeToggle = (nextIsLogin: boolean) => {
    setIsLogin(nextIsLogin);
    clearError();
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      referralCode: nextIsLogin ? '' : inviteFromLink ?? '',
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');

    if (invite) {
      setInviteFromLink(invite);
      setIsLogin(false);
      setFormData((prev) => ({
        ...prev,
        referralCode: invite,
      }));
    }
  }, []);

  return (
    <div className="login-screen">
      <GalaxyBackground />
      {/* Logo and 3D Car Animation Header */}
      <LogoHeader />

      <Glass
        className="login-card fade-in"
        borderRadius={24}
        style={{ maxWidth: '480px', width: '100%', margin: '0 auto' }}
      >
        <div className="login-card__content" style={{ width: '100%', padding: '32px' }}>
          <header className="login-card__header">
            <p className="login-card__subtitle">A experiência definitiva de drift competitivo.</p>
          </header>

          <div className="login-card__toggle">
            <div className="button-segmented-group" style={{ display: 'flex', gap: '8px', padding: '4px', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '12px' }}>
              <button
                type="button"
                className={`button-segmented ${isLogin ? 'is-active' : ''}`}
                onClick={() => handleModeToggle(true)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isLogin ? 'rgba(147, 51, 234, 0.3)' : 'transparent',
                  color: isLogin ? '#a78bfa' : 'rgba(165, 174, 188, 0.8)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isLogin ? '0 0 20px rgba(147, 51, 234, 0.3)' : 'none',
                }}
              >
                Entrar
              </button>
              <button
                type="button"
                className={`button-segmented ${!isLogin ? 'is-active' : ''}`}
                onClick={() => handleModeToggle(false)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: !isLogin ? 'rgba(147, 51, 234, 0.3)' : 'transparent',
                  color: !isLogin ? '#a78bfa' : 'rgba(165, 174, 188, 0.8)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: !isLogin ? '0 0 20px rgba(147, 51, 234, 0.3)' : 'none',
                }}
              >
                Criar conta
              </button>
            </div>
          </div>

          {inviteFromLink && !isLogin && (
            <div className="alert alert--success">
              <span className="alert__icon"><PartyIcon size={20} color="#10b981" /></span>
              Convite detectado! Seu código foi aplicado automaticamente.
            </div>
          )}

          {error && (
            <div className="alert alert--error">
              <span className="alert__icon"><WarningIcon size={20} color="#ef4444" /></span>
              {error}
            </div>
          )}

          <form className="login-card__form" onSubmit={handleSubmit}>
            <div className="login-card__inputs">
              <div>
                <label htmlFor="auth-username">Usuário</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="auth-username"
                    type="text"
                    placeholder="ex: driftmaster"
                    value={formData.username}
                    onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                    autoComplete="username"
                    required
                    style={{ paddingRight: '45px' }}
                  />
                  {!isLogin && (
                    <button
                      type="button"
                      onClick={handleGenerateUsername}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.7,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                      aria-label="Gerar username aleatório"
                    >
                      <WandIcon size={20} color="#9333ea" />
                    </button>
                  )}
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="auth-email">Email</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="auth-email"
                      type="email"
                      placeholder="voce@exemplo.com"
                      value={formData.email}
                      onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                      autoComplete="email"
                      required
                      style={{ paddingRight: '45px' }}
                    />
                    <button
                      type="button"
                      onClick={handleGenerateEmail}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.7,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                      aria-label="Gerar email aleatório"
                    >
                      <WandIcon size={20} color="#9333ea" />
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="auth-password">Senha {!isLogin && '(mínimo 8 caracteres)'}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    minLength={!isLogin ? 8 : undefined}
                    required
                    style={{ paddingRight: '45px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.7,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOffIcon size={20} color="#A5AEBC" /> : <EyeIcon size={20} color="#A5AEBC" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="auth-confirm">Confirmar senha</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="auth-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repita sua senha"
                      value={formData.confirmPassword}
                      onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
                      autoComplete="new-password"
                      required
                      style={{ paddingRight: '45px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.7,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                      aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showConfirmPassword ? <EyeOffIcon size={20} color="#A5AEBC" /> : <EyeIcon size={20} color="#A5AEBC" />}
                    </button>
                  </div>
                </div>
              )}

            </div>

            <div className="login-card__actions">
              <button type="submit" className="button-cta" disabled={isLoading}>
                {isLoading ? 'Carregando…' : isLogin ? 'Entrar agora' : 'Começar jornada'}
              </button>
              <small className="text-muted" style={{ textAlign: 'center' }}>
                Ao continuar você concorda com nossas diretrizes competitivas premium.
              </small>
            </div>
          </form>
        </div>
      </Glass>

      {/* Features Section */}
      <Glass
        className="login-features-container fade-in"
        borderRadius={24}
        style={{ maxWidth: '900px', width: '100%', margin: '24px auto 0', padding: '32px' }}
      >
        <div className="ui-label-muted" style={{ marginBottom: '16px', textAlign: 'center' }}>
          Recursos principais
        </div>
        <div className="login-feature-grid">
          <div className="login-feature">
            <span className="login-feature__icon"><GamepadIcon size={24} /></span>
            Multiplayer em tempo real
          </div>
          <div className="login-feature">
            <span className="login-feature__icon"><WalletIcon size={24} /></span>
            Apostas virtuais seguras
          </div>
          <div className="login-feature">
            <span className="login-feature__icon"><TrophyIcon size={24} /></span>
            Ranking global competitivo
          </div>
          <div className="login-feature">
            <span className="login-feature__icon"><BoltIcon size={24} /></span>
            Física refinada de drift
          </div>
        </div>
      </Glass>

      {/* Info Sections */}
      <div className="login-info-section" style={{ marginTop: '48px', display: 'flex', gap: '32px', alignItems: 'center', maxWidth: '900px', margin: '48px auto 0' }}>
        <div style={{ flex: 1 }}>
          <img src="/logo.webp" alt="Drift Multiplayer" style={{ width: '100%', borderRadius: '12px', boxShadow: '0 8px 32px rgba(65, 105, 225, 0.3)' }} />
        </div>
        <div style={{ flex: 1, color: 'var(--color-text-primary)' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px', background: 'linear-gradient(135deg, #4169E1 0%, #6E8BFF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Competição em Tempo Real
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
            Enfrente jogadores do mundo todo em partidas multiplayer intensas. Prove suas habilidades de drift em pistas dinâmicas que se estreitam a cada conquista. Apenas os melhores pilotos alcançam o topo do ranking global.
          </p>
        </div>
      </div>

      <div className="login-info-section" style={{ marginTop: '48px', display: 'flex', gap: '32px', alignItems: 'center', maxWidth: '900px', margin: '48px auto 0', flexDirection: 'row-reverse' }}>
        <div style={{ flex: 1 }}>
          <img src="/logo.webp" alt="Sistema de Apostas" style={{ width: '100%', borderRadius: '12px', boxShadow: '0 8px 32px rgba(65, 105, 225, 0.3)' }} />
        </div>
        <div style={{ flex: 1, color: 'var(--color-text-primary)' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px', background: 'linear-gradient(135deg, #4169E1 0%, #6E8BFF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Sistema de Recompensas
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
            Aposte em suas habilidades e ganhe recompensas reais. Sistema de apostas seguro com depósitos via PIX, programa de afiliados com comissões em múltiplos níveis e prêmios para os melhores colocados no ranking mensal.
          </p>
        </div>
      </div>

      <FAQSection />

      <Footer />
    </div>
  );
};
