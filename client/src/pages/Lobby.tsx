import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/useAuth';
import { useAppStore } from '../store/useApp';
import { useGameStore } from '../store/useGame';
import { TicketCarousel } from '../components/TicketCarousel';
import { WalletPanel } from '../components/WalletPanel';
import { AffiliatePanel } from '../components/AffiliatePanel';
import { AdminPanel } from '../components/AdminPanel';
import { ProfilePanel } from '../components/ProfilePanel';
import { LogoHeader } from '../components/LogoHeader';
import { GalaxyBackground } from '../components/GalaxyBackground';
import { RankingPanel } from '../components/RankingPanel';
import { CustomizationPanel } from '../components/CustomizationPanel';
import { GamepadIcon, MoneyIcon, UsersIcon, RankingIcon, UserIcon, SettingsIcon, PlayIcon, PlusIcon, KeyIcon, GlobeIcon, EditIcon } from '../components/icons/Icons';
import { FAQSection } from '../components/FAQSection';

type LobbyTab = 'play' | 'wallet' | 'affiliates' | 'ranking' | 'profile' | 'customization' | 'admin';
type StartMode = 'multiplayer' | 'demo';

interface ConnectOptions {
  queueType: 'public' | 'private';
  betAmount: number;
  platformUserId: string;
  displayName: string;
  inviteCode?: string;
  createPrivate?: boolean;
  roomId?: string;
}

export const Lobby: React.FC = () => {
  const { user, wallet, logout, refreshWallet } = useAuthStore();
  const { setScreen } = useAppStore();
  const { setGameMode, configureMultiplayer, resetGame } = useGameStore();
  const [activeTab, setActiveTab] = useState<LobbyTab>('play');
  const [betAmount, setBetAmount] = useState(2);
  const [roomMode, setRoomMode] = useState<'public' | 'create-private' | 'join-private'>('public');
  const [inviteCode, setInviteCode] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [showAvatarSave, setShowAvatarSave] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!user) {
    return null;
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Imagem muito grande! Máximo 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setAvatarPreview(dataUrl);
        setShowAvatarSave(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = () => {
    if (avatarPreview) {
      setAvatarUrl(avatarPreview);
      localStorage.setItem(`avatar_${user.id}`, avatarPreview);
      setShowAvatarSave(false);
      setAvatarPreview('');
    }
  };

  const handleCancelAvatar = () => {
    setAvatarPreview('');
    setShowAvatarSave(false);
  };

  React.useEffect(() => {
    const savedAvatar = localStorage.getItem(`avatar_${user.id}`);
    if (savedAvatar) {
      setAvatarUrl(savedAvatar);
    }
  }, [user.id]);

  const tabs = useMemo<Array<{ key: LobbyTab; label: string; icon: React.ReactNode }>>(() => {
    const baseTabs: Array<{ key: LobbyTab; label: string; icon: React.ReactNode }> = [
      { key: 'play', label: 'Jogar', icon: <GamepadIcon size={24} color="#9333ea" /> },
      { key: 'customization', label: 'Personalizar', icon: <EditIcon size={24} color="#9333ea" /> },
      { key: 'wallet', label: 'Carteira', icon: <MoneyIcon size={24} color="#9333ea" /> },
      { key: 'affiliates', label: 'Afiliados', icon: <UsersIcon size={24} color="#9333ea" /> },
      { key: 'ranking', label: 'Ranking', icon: <RankingIcon size={24} color="#9333ea" /> },
      { key: 'profile', label: 'Perfil', icon: <UserIcon size={24} color="#9333ea" /> },
    ];

    if (user.role === 'admin') {
      baseTabs.push({ key: 'admin', label: 'Admin', icon: <SettingsIcon size={24} color="#9333ea" /> });
    }

    return baseTabs;
  }, [user.role]);

  useEffect(() => {
    if (activeTab === 'wallet' && user?.id) {
      void refreshWallet();
    }
  }, [activeTab, refreshWallet, user?.id]);

  // Auto-scroll carousel effect
  React.useEffect(() => {
    const track = document.querySelector('.lobby-nav-track') as HTMLElement;
    if (!track) return;

    let scrollPosition = track.scrollLeft;
    const scrollSpeed = 0.3; // pixels per frame
    let animationId: number;
    let isUserInteracting = false;
    let userInteractionTimeout: NodeJS.Timeout;

    const animate = () => {
      if (!isUserInteracting) {
        scrollPosition += scrollSpeed;

        // Check if reached end
        const maxScroll = track.scrollWidth - track.clientWidth;
        if (scrollPosition >= maxScroll) {
          // Smoothly reset to beginning
          track.scrollTo({ left: 0, behavior: 'smooth' });
          scrollPosition = 0;
        } else {
          track.scrollLeft = scrollPosition;
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    // Pause when user interacts
    const handleInteractionStart = () => {
      isUserInteracting = true;
      clearTimeout(userInteractionTimeout);
    };

    const handleInteractionEnd = () => {
      clearTimeout(userInteractionTimeout);
      // Resume animation after 2 seconds of no interaction
      userInteractionTimeout = setTimeout(() => {
        isUserInteracting = false;
        scrollPosition = track.scrollLeft;
      }, 2000);
    };

    const handleScroll = () => {
      if (!isUserInteracting) {
        handleInteractionStart();
      }
      handleInteractionEnd();
    };

    track.addEventListener('mouseenter', handleInteractionStart);
    track.addEventListener('mouseleave', handleInteractionEnd);
    track.addEventListener('touchstart', handleInteractionStart);
    track.addEventListener('touchend', handleInteractionEnd);
    track.addEventListener('wheel', handleScroll, { passive: true });
    track.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(userInteractionTimeout);
      track.removeEventListener('mouseenter', handleInteractionStart);
      track.removeEventListener('mouseleave', handleInteractionEnd);
      track.removeEventListener('touchstart', handleInteractionStart);
      track.removeEventListener('touchend', handleInteractionEnd);
      track.removeEventListener('wheel', handleScroll);
      track.removeEventListener('scroll', handleScroll);
    };
  }, [tabs]);

  // Scroll to active tab when it changes
  React.useEffect(() => {
    const track = document.querySelector('.lobby-nav-track') as HTMLElement;
    if (!track) return;

    const activePill = track.querySelector(`.nav-pill[data-tab-key="${activeTab}"]`) as HTMLElement;
    if (activePill) {
      const trackRect = track.getBoundingClientRect();
      const pillRect = activePill.getBoundingClientRect();

      // Calculate offset to center the pill
      const offset = pillRect.left - trackRect.left - (trackRect.width / 2) + (pillRect.width / 2);

      track.scrollBy({
        left: offset,
        behavior: 'smooth'
      });
    }
  }, [activeTab]);

  const handleStartGame = (mode: StartMode, options?: ConnectOptions) => {
    resetGame();
    if (mode === 'multiplayer') {
      const enriched: ConnectOptions | undefined = options
        ? {
            ...options,
            platformUserId: user?.id ?? options.platformUserId,
            displayName: user?.username ?? options.displayName,
          }
        : user
        ? {
            // BUG FIX: Ensure both 'create-private' and 'join-private' set queueType to 'private'
            queueType: roomMode === 'public' ? 'public' : 'private',
            betAmount: betAmount,
            platformUserId: user.id,
            displayName: user.username,
            ...(roomMode === 'join-private' && inviteCode ? { inviteCode: inviteCode.trim().toUpperCase() } : {}),
            ...(roomMode === 'create-private' ? { createPrivate: true } : {})
          }
        : undefined;

      if (!enriched) {
        setGameMode('demo');
        setScreen('game');
        return;
      }

      // Validate user balance before entering match
      const userBalance = wallet?.balance || 0;
      if (userBalance < enriched.betAmount) {
        alert(`Saldo insuficiente! Você precisa de R$ ${enriched.betAmount.toFixed(2)} mas possui apenas R$ ${userBalance.toFixed(2)}. Por favor, faça um depósito.`);
        setActiveTab('wallet');
        return;
      }

      configureMultiplayer(enriched);
      setGameMode(mode);
      // Para multiplayer, vamos primeiro para a tela de espera
      setScreen('waiting');
    } else {
      // Para demo e practice, vamos direto para o jogo
      setGameMode(mode);
      setScreen('game');
    }
  };

  const ticketOptions = [
    { value: 2, label: 'Iniciante', prize: 8.5 },
    { value: 5, label: 'Intermediário', prize: 22.5 },
    { value: 25, label: 'Avançado', prize: 112.5 },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'play':
        return (
          <div className="stack">
            {/* Multiplayer Mode with Integrated Value Selection */}
            <div className="panel-tonal">
              <h2 style={{ margin: '0 0 24px 0', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '2rem' }}>🏆</span>
                <span>Partida Multiplayer</span>
              </h2>

              {/* Room Mode Selection */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>
                  Tipo de Sala
                </label>
                <div className="room-type-buttons" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                  <button
                    className={`button-secondary ${roomMode === 'public' ? 'button-secondary--active' : ''}`}
                    onClick={() => setRoomMode('public')}
                    style={{
                      padding: '12px',
                      border: roomMode === 'public' ? '2px solid var(--color-primary)' : undefined,
                      backgroundColor: roomMode === 'public' ? 'rgba(147, 51, 234, 0.1)' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      justifyContent: 'center'
                    }}
                  >
                    <GlobeIcon size={18} color="#9333ea" /> Sala Pública
                  </button>
                  <button
                    className={`button-secondary ${roomMode === 'create-private' ? 'button-secondary--active' : ''}`}
                    onClick={() => setRoomMode('create-private')}
                    style={{
                      padding: '12px',
                      border: roomMode === 'create-private' ? '2px solid var(--color-primary)' : undefined,
                      backgroundColor: roomMode === 'create-private' ? 'rgba(147, 51, 234, 0.1)' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      justifyContent: 'center'
                    }}
                  >
                    <PlusIcon size={18} color="#9333ea" /> Criar Privada
                  </button>
                  <button
                    className={`button-secondary ${roomMode === 'join-private' ? 'button-secondary--active' : ''}`}
                    onClick={() => setRoomMode('join-private')}
                    style={{
                      padding: '12px',
                      border: roomMode === 'join-private' ? '2px solid var(--color-primary)' : undefined,
                      backgroundColor: roomMode === 'join-private' ? 'rgba(147, 51, 234, 0.1)' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      justifyContent: 'center'
                    }}
                  >
                    <KeyIcon size={18} color="#9333ea" /> Entrar com Código
                  </button>
                </div>
              </div>

              {/* Invite Code Input (only for join-private mode) */}
              {roomMode === 'join-private' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>
                    Código da Sala
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o código de convite"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '1.1rem',
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      fontWeight: '700',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase'
                    }}
                    maxLength={6}
                  />
                </div>
              )}

              <TicketCarousel
                options={ticketOptions}
                selectedValue={betAmount}
                onValueChange={setBetAmount}
                userBalance={wallet?.balance || 0}
              />

              <button
                className="button-cta"
                onClick={() => handleStartGame('multiplayer')}
                disabled={roomMode === 'join-private' && !inviteCode}
                style={{
                  width: '100%',
                  marginTop: '24px',
                  padding: '16px',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  opacity: roomMode === 'join-private' && !inviteCode ? 0.5 : 1,
                  cursor: roomMode === 'join-private' && !inviteCode ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                {roomMode === 'public' && <><PlayIcon size={20} color="#FFF" /> Entrar na Partida Pública</>}
                {roomMode === 'create-private' && <><PlusIcon size={20} color="#FFF" /> Criar Sala Privada</>}
                {roomMode === 'join-private' && <><KeyIcon size={20} color="#FFF" /> Entrar na Sala Privada</>}
              </button>
            </div>

            {/* Demo Mode */}
            <div className="panel-tonal">
              <div className="play-card" onClick={() => handleStartGame('demo')} style={{ cursor: 'pointer', border: '2px solid var(--color-border)', padding: '24px', borderRadius: '16px', transition: 'all 0.3s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div className="play-card__icon" style={{ fontSize: '3rem' }}>🚗</div>
                  <div style={{ flex: 1 }}>
                    <div className="play-card__title" style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--color-text-primary)' }}>Modo Demo</div>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '1rem' }}>
                      Experimente o jogo gratuitamente
                    </p>
                  </div>
                  <div style={{ fontSize: '1.5rem', color: 'var(--color-text-secondary)' }}>→</div>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <FAQSection />
          </div>
        );

      case 'wallet':
        return <WalletPanel />;

      case 'affiliates':
        return <AffiliatePanel />;

      case 'ranking':
        return <RankingPanel />;

      case 'profile':
        return <ProfilePanel />;

      case 'customization':
        return <CustomizationPanel />;

      case 'admin':
        return <AdminPanel />;

      default:
        return null;
    }
  };

  return (
    <div className="lobby-shell">
      <GalaxyBackground />
      {/* Fixed Top Bar with User Info */}
      <div className="fixed-top-bar">
        {/* Avatar Circle */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div
            className="avatar-upload-container"
            onClick={() => !showAvatarSave && fileInputRef.current?.click()}
            style={{
              position: 'relative',
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              cursor: showAvatarSave ? 'default' : 'pointer',
              border: '2px solid rgba(147, 51, 234, 0.5)',
              backgroundColor: 'rgba(17, 23, 35, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              aspectRatio: '1/1'
            }}
          >
            {(avatarPreview || avatarUrl) ? (
              <img
                src={avatarPreview || avatarUrl}
                alt="Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              <UserIcon size={24} color="#9333ea" />
            )}
            {!showAvatarSave && (
              <div style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#9333ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #0B0F14',
                zIndex: 999
              }}>
                <EditIcon size={10} color="#FFFFFF" />
              </div>
            )}
          </div>

          {showAvatarSave && (
            <div style={{ display: 'flex', gap: '4px', position: 'absolute', top: '52px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', zIndex: 1001 }}>
              <button
                onClick={handleSaveAvatar}
                className="button-cta"
                style={{ padding: '4px 8px', fontSize: '0.7rem', minWidth: 'auto' }}
              >
                ✓ Salvar
              </button>
              <button
                onClick={handleCancelAvatar}
                className="button-secondary"
                style={{ padding: '4px 8px', fontSize: '0.7rem', minWidth: 'auto' }}
              >
                ✗
              </button>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          style={{ display: 'none' }}
        />

        <span className="top-bar-username">{user.username}</span>
        <span className="top-bar-divider">|</span>
        <div className="top-bar-balance-container">
          <span className="top-bar-balance-label">Saldo:</span>
          <span className="top-bar-balance">
            {wallet ? `R$ ${wallet.balance.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
          </span>
        </div>
        {user.role === 'admin' && (
          <>
            <span className="top-bar-divider">|</span>
            <span className="top-bar-admin">👑 ADMIN</span>
          </>
        )}
      </div>

      {/* Animated Smoke Background */}
      <div className="smoke-background">
        <div className="smoke-particle smoke-particle-1"></div>
        <div className="smoke-particle smoke-particle-2"></div>
        <div className="smoke-particle smoke-particle-3"></div>
        <div className="smoke-particle smoke-particle-4"></div>
        <div className="smoke-particle smoke-particle-5"></div>
      </div>

      <div className="lobby-container">
        {/* Header with Logo and 3D Car Animation */}
        <div className="lobby-header-new">
          <LogoHeader />
        </div>

        {/* Navigation with Auto-Scroll Carousel */}
        <div className="lobby-nav">
          <div className="lobby-nav-track">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`nav-pill ${activeTab === tab.key ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                data-tab-key={tab.key}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="lobby-main">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};
