import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../store/useAuth';
import { useAppStore } from '../store/useApp';
import { useGameStore } from '../store/useGame';
import {
  usePlatformStore,
  type PlatformUser,
  type PixPaymentRequest,
  type WithdrawalRequest,
  type AffiliateCommissionSettings,
  type AdminSettings,
  type Role,
  type WithdrawalStatus,
} from '../store/usePlatformStore';
import { generateQrDataUrl } from '../utils/qrGenerator';
import { MultiplayerSync } from '../game/MultiplayerSync';
import type { ConnectOptions, LobbyRoomSummary } from '../game/MultiplayerSync';
import { TicketCarousel } from '../components/TicketCarousel';
import { AffiliatePanel } from '../components/AffiliatePanel';
import { AdminPanel } from '../components/AdminPanel';

type LobbyTab = 'play' | 'wallet' | 'affiliates' | 'leaderboard' | 'profile' | 'admin';

type StartMode = 'multiplayer' | 'demo' | 'practice';

const currency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const Lobby: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LobbyTab>('play');
  const [isMobile, setIsMobile] = useState(false);

  const { user, wallet, logout, refreshUser, refreshWallet } = useAuthStore();
  const { setScreen } = useAppStore();
  const { setGameMode, resetGame, configureMultiplayer } = useGameStore();

  const platformState = usePlatformStore((state) => ({
    users: state.users,
    adminSettings: state.adminSettings,
    createPixPayment: state.createPixPayment,
    markPixPaymentPaid: state.markPixPaymentPaid,
    expirePixPayment: state.expirePixPayment,
    requestWithdrawal: state.requestWithdrawal,
    updateWithdrawalStatus: state.updateWithdrawalStatus,
    setUserRole: state.setUserRole,
    setAffiliateLevel: state.setAffiliateLevel,
    updateAffiliateCommission: state.updateAffiliateCommission,
    setPresetPixAmounts: state.setPresetPixAmounts,
  }));

  // Criar um usuário compatível para componentes que ainda precisam do formato antigo
  const legacyUser = user ? platformState.users[user.id] ?? null : null;
  const refreshAttemptedRef = useRef(false);

  useEffect(() => {
    const updateResponsiveLayout = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    updateResponsiveLayout();
    window.addEventListener('resize', updateResponsiveLayout);
    return () => window.removeEventListener('resize', updateResponsiveLayout);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const previous = {
      htmlHeight: html.style.height,
      htmlOverflow: html.style.overflow,
      bodyHeight: body.style.height,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
    };

    html.style.height = 'auto';
    html.style.overflowY = 'auto';
    body.style.height = 'auto';
    body.style.overflowY = 'auto';
    body.style.position = 'relative';

    return () => {
      html.style.height = previous.htmlHeight;
      html.style.overflow = previous.htmlOverflow;
      body.style.height = previous.bodyHeight;
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      logout();
      setScreen('login');
    }
  }, [user, logout, setScreen]);

  // Atualizar carteira quando o usuário estiver logado
  useEffect(() => {
    if (user && !wallet) {
      refreshWallet();
    }
  }, [user, wallet, refreshWallet]);

  if (!user) {
    return <div>Carregando...</div>;
  }

  // Aguardar o wallet carregar
  if (!wallet) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div>Carregando dados da carteira...</div>
        <div>💰</div>
      </div>
    );
  }

  const tabs: Array<{ key: LobbyTab; label: string; icon: string }> = [
    { key: 'play', label: 'Jogar', icon: '🎮' },
    { key: 'wallet', label: 'Carteira', icon: '💼' },
    { key: 'affiliates', label: 'Afiliados', icon: '🤝' },
    { key: 'leaderboard', label: 'Ranking', icon: '🏆' },
    { key: 'profile', label: 'Perfil', icon: '👤' },
  ];

  if (user.role === 'admin') {
    tabs.push({ key: 'admin', label: 'Admin', icon: '🛠️' });
  }

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
            queueType: 'public',
            betAmount: 2,
            platformUserId: user.id,
            displayName: user.username,
          }
        : undefined;

      if (!enriched) {
        setGameMode('demo');
        setScreen('game');
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

  return (
    <div className="lobby-shell">
      <div className="lobby-container">
        <header className="lobby-header fade-in">
          <div className="lobby-header__identity">
            <span className="ui-label-muted">Sessão ativa</span>
            <h1 className="ui-gradient-text" style={{ fontSize: isMobile ? '1.8rem' : '2.1rem' }}>
              🏎️ Drift cash
            </h1>
            <span className="text-secondary">Bem-vindo de volta, {user.username}</span>
          </div>
          <div className="lobby-header__meta">
            <div className="pill-stat">
              <span role="img" aria-label="saldo">💰</span>
              <span className="pill-stat__value">{currency(wallet?.balance ?? 0)}</span>
            </div>
            <div className="pill-stat" style={{ textTransform: 'capitalize' }}>
              <span role="img" aria-label="perfil">👤</span>
              <span className="pill-stat__value">{user.role}</span>
            </div>
          </div>
        </header>

        <nav className="lobby-nav">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`nav-pill ${activeTab === tab.key ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <main className="lobby-main">
          {activeTab === 'play' && (
            <PlayTab
              onStartGame={handleStartGame}
              isMobile={isMobile}
              currentUser={user}
            />
          )}
          {activeTab === 'wallet' && legacyUser && (
            <WalletTab
              user={legacyUser}
              presetAmounts={platformState.adminSettings.presetPixAmounts}
              onCreatePix={(amount) =>
                platformState.createPixPayment(user.id, amount)
              }
              onRequestWithdrawal={(amount) =>
                platformState.requestWithdrawal(user.id, amount)
              }
              isMobile={isMobile}
            />
          )}
          {activeTab === 'affiliates' && legacyUser && (
            <AffiliatesTab
              user={legacyUser}
              users={platformState.users}
              commission={platformState.adminSettings.affiliateCommission}
              isMobile={isMobile}
            />
          )}
          {activeTab === 'leaderboard' && (
            <LeaderboardTab username={user.username} isMobile={isMobile} />
          )}
          {activeTab === 'profile' && legacyUser && (
            <ProfileTab
              user={legacyUser}
              isMobile={isMobile}
              onLogout={() => {
                logout();
                setScreen('login');
              }}
            />
          )}
          {activeTab === 'admin' && user.role === 'admin' && (
            <AdminTab
              users={platformState.users}
              adminSettings={platformState.adminSettings}
              onUpdateCommission={platformState.updateAffiliateCommission}
              onUpdatePresetAmounts={platformState.setPresetPixAmounts}
              onSetUserRole={platformState.setUserRole}
              onSetAffiliateLevel={platformState.setAffiliateLevel}
              onMarkPixPaymentPaid={platformState.markPixPaymentPaid}
              onExpirePixPayment={platformState.expirePixPayment}
              onUpdateWithdrawalStatus={platformState.updateWithdrawalStatus}
              isMobile={isMobile}
            />
          )}
        </main>
      </div>
    </div>
  );
};

interface PlayTabProps {
  onStartGame: (mode: StartMode, options?: ConnectOptions) => void;
  isMobile: boolean;
  currentUser: { id: string; username: string; role: string } | null;
}

const MATCH_CAPACITY = 5;
const PUBLIC_BETS = [2, 5, 25] as const;
const MIN_PRIVATE_BET = 2;

const PlayTab: React.FC<PlayTabProps> = ({ onStartGame, isMobile, currentUser }) => {
  const { wallet } = useAuthStore();
  const lobbySyncRef = useRef(new MultiplayerSync());
  const [roomsSnapshot, setRoomsSnapshot] = useState<LobbyRoomSummary[]>([]);
  const [publicQueues, setPublicQueues] = useState<Record<number, LobbyRoomSummary | undefined>>({});
  const [privateBet, setPrivateBet] = useState('20');
  const [joinCode, setJoinCode] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedPublicBet, setSelectedPublicBet] = useState<number>(PUBLIC_BETS[0]);
  const userBalance = wallet?.balance ?? 0;

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const rooms = await lobbySyncRef.current.fetchAvailableRooms();
        if (cancelled) {
          return;
        }
        setRoomsSnapshot(rooms);
        const summary: Record<number, LobbyRoomSummary | undefined> = {};
        PUBLIC_BETS.forEach((bet) => {
          summary[bet] = rooms
            .filter((room) => room.roomType === 'public' && room.betAmount === bet && room.status !== 'finished')
            .sort((a, b) => a.clients - b.clients)[0];
        });
        setPublicQueues(summary);
        setLoadingRooms(false);
      } catch (error) {
        if (!cancelled) {
          console.warn('Não foi possível atualizar o lobby', error);
          setLoadingRooms(false);
        }
      }
    };

    setLoadingRooms(true);
    refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const clearFeedback = useCallback(() => setFeedback(null), []);

  const requireAuth = useCallback(() => {
    if (!currentUser) {
      setFeedback({ type: 'error', text: 'Faça login para participar das partidas.' });
      return false;
    }
    return true;
  }, [currentUser]);

  const ensureFunds = useCallback((amount: number, context: string) => {
    if (!requireAuth()) {
      return false;
    }
    if (userBalance < amount) {
      const balance = currency(userBalance);
      setFeedback({
        type: 'error',
        text: `Saldo insuficiente para ${context}. Saldo disponível: ${balance}.`
      });
      return false;
    }
    return true;
  }, [currentUser, requireAuth]);

  const handleJoinPublic = (bet: number) => {
    if (!ensureFunds(bet, `entrar na sala pública de R$ ${bet.toFixed(2)}`)) {
      return;
    }
    clearFeedback();
    onStartGame('multiplayer', { queueType: 'public', betAmount: bet });
  };

  const handleCreatePrivate = () => {
    if (!requireAuth()) {
      return;
    }
    const parsed = Number(privateBet.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < MIN_PRIVATE_BET) {
      setFeedback({
        type: 'error',
        text: `A aposta mínima para salas privadas é de R$ ${MIN_PRIVATE_BET.toFixed(2)}.`
      });
      return;
    }

    const normalized = Number(parsed.toFixed(2));
    if (!ensureFunds(normalized, 'criar a sala privada')) {
      return;
    }

    clearFeedback();
    onStartGame('multiplayer', {
      queueType: 'private',
      betAmount: normalized,
      createPrivate: true
    });
  };

  const handleJoinPrivate = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setFeedback({ type: 'error', text: 'Digite o código da partida privada.' });
      return;
    }

    const match = roomsSnapshot.find((room) =>
      room.roomType === 'private' && room.inviteCode?.toUpperCase() === code
    );

    if (!match) {
      setFeedback({ type: 'error', text: 'Nenhuma sala encontrada para o código informado.' });
      return;
    }

    const bet = match.betAmount || MIN_PRIVATE_BET;
    if (!ensureFunds(bet, `entrar na sala privada de R$ ${bet.toFixed(2)}`)) {
      return;
    }

    clearFeedback();
    onStartGame('multiplayer', {
      queueType: 'private',
      betAmount: bet,
      inviteCode: code,
      roomId: match.roomId
    });
  };

  const handleStartDemo = () => {
    clearFeedback();
    onStartGame('demo');
  };

  const handleStartPractice = () => {
    clearFeedback();
    onStartGame('practice');
  };

  const cardWidthStyle = isMobile ? { width: '100%' } : undefined;

  return (
    <div className="stack" style={{ gap: isMobile ? 20 : 32 }}>
      {feedback && (
        <div className={`alert ${feedback.type === 'error' ? 'alert--error' : 'alert--success'}`}>
          <span className="alert__icon" role="img" aria-label={feedback.type === 'error' ? 'erro' : 'sucesso'}>
            {feedback.type === 'error' ? '⚠️' : '✅'}
          </span>
          {feedback.text}
        </div>
      )}
      <section className="panel-tonal stack" style={{ gap: 20 }}>
        <header className="stack" style={{ gap: 6 }}>
          <h2 style={{ margin: 0 }}>Partidas públicas</h2>
          <p className="text-secondary" style={{ margin: 0 }}>
            Escolha o ticket e participe da próxima sala disponível. Saldo disponível: {currency(userBalance)}.
          </p>
        </header>
        <TicketCarousel
          options={PUBLIC_BETS.map(bet => ({
            value: bet,
            label: `Ticket`,
            prize: bet * 4
          }))}
          selectedValue={selectedPublicBet}
          onValueChange={setSelectedPublicBet}
          userBalance={userBalance}
          disabled={loadingRooms}
        />

        {/* Status da sala selecionada */}
        {(() => {
          const queue = publicQueues[selectedPublicBet];
          const players = queue ? queue.clients : 0;
          const capacity = queue ? queue.maxClients : MATCH_CAPACITY;
          const status = queue?.status ?? 'waiting';
          const statusLabel =
            status === 'countdown'
              ? 'Iniciando'
              : status === 'active'
              ? 'Em andamento'
              : 'Aguardando';
          const locked = queue?.locked ?? false;
          const insufficientFunds = userBalance < selectedPublicBet;

          return (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              marginTop: '20px'
            }}>
              <div>
                <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>
                  Sala {currency(selectedPublicBet)}
                </h4>
                <p className="text-secondary" style={{ margin: 0 }}>
                  {statusLabel} • {players}/{capacity} jogadores
                </p>
              </div>
              <button
                type="button"
                className="button-cta"
                onClick={() => handleJoinPublic(selectedPublicBet)}
                disabled={locked || status === 'active' || insufficientFunds}
                title={
                  locked || status === 'active'
                    ? 'Sala indisponível no momento'
                    : insufficientFunds
                    ? 'Saldo insuficiente para entrar nesta partida'
                    : undefined
                }
                style={{
                  minWidth: '200px',
                  opacity: locked || status === 'active' || insufficientFunds ? 0.6 : 1
                }}
              >
                {locked || status === 'active'
                  ? 'Sala indisponível'
                  : insufficientFunds
                  ? 'Saldo insuficiente'
                  : `Entrar na Partida`}
              </button>
            </div>
          );
        })()}
        {loadingRooms && (
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
            Atualizando disponibilidade das salas...
          </span>
        )}
      </section>

      <section className="panel-tonal stack" style={{ gap: 20 }}>
        <header className="stack" style={{ gap: 6 }}>
          <h2 style={{ margin: 0 }}>Partidas privadas</h2>
          <p className="text-secondary" style={{ margin: 0 }}>
            Crie uma sala exclusiva com aposta personalizada (mínimo R$ {MIN_PRIVATE_BET.toFixed(2)}) ou entre usando um código de convite.
          </p>
        </header>
        <div className="stack" style={{ gap: 16 }}>
          <div className="stack" style={{ gap: 8 }}>
            <label htmlFor="private-bet">Valor da aposta (R$)</label>
            <input
              id="private-bet"
              type="number"
              min={MIN_PRIVATE_BET}
              value={privateBet}
              onChange={(event) => {
                setPrivateBet(event.target.value);
                clearFeedback();
              }}
            />
            <button type="button" className="button-cta" onClick={handleCreatePrivate}>
              Criar partida privada
            </button>
          </div>

          <div className="divider-soft" />

          <div className="stack" style={{ gap: 8 }}>
            <label htmlFor="private-code">Entrar com código</label>
            <input
              id="private-code"
              type="text"
              placeholder="EXEMPLO"
              value={joinCode}
              onChange={(event) => {
                setJoinCode(event.target.value.toUpperCase());
                clearFeedback();
              }}
            />
            <button type="button" className="button-secondary" onClick={handleJoinPrivate}>
              Entrar na sala privada
            </button>
          </div>
        </div>
      </section>

      <section className="panel-tonal stack" style={{ gap: 16 }}>
        <header className="stack" style={{ gap: 6 }}>
          <h2 style={{ margin: 0 }}>Treinar</h2>
          <p className="text-secondary" style={{ margin: 0 }}>
            Explore o jogo sem riscos financeiros antes de competir.
          </p>
        </header>
        <div className="card-grid">
          <div className="play-card play-card--secondary">
            <div className="play-card__icon">🎮</div>
            <h3 className="play-card__title">Modo Demo</h3>
            <p className="text-secondary">Experimente o jogo instantaneamente.</p>
            <button type="button" className="button-secondary" style={cardWidthStyle} onClick={handleStartDemo}>
              Jogar demo
            </button>
          </div>
          <div className="play-card play-card--outline">
            <div className="play-card__icon">🎯</div>
            <h3 className="play-card__title">Modo Prática</h3>
            <p className="text-secondary">Treine e teste o novo traçado das pistas.</p>
            <button type="button" className="button-secondary" style={cardWidthStyle} onClick={handleStartPractice}>
              Praticar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

interface WalletTabProps {
  user: PlatformUser;
  presetAmounts: number[];
  onCreatePix: (amount: number) => PixPaymentRequest;
  onRequestWithdrawal: (amount: number) => WithdrawalRequest;
  isMobile: boolean;
}

const WalletTab: React.FC<WalletTabProps> = ({
  user,
  presetAmounts,
  onCreatePix,
  onRequestWithdrawal,
  isMobile,
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(presetAmounts[0] ?? null);
  const [customAmount, setCustomAmount] = useState('');
  const [currentPix, setCurrentPix] = useState<PixPaymentRequest | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [withdrawValue, setWithdrawValue] = useState('');

  const handleGeneratePix = () => {
    try {
      const amount = selectedAmount ?? parseFloat(customAmount.replace(',', '.'));
      if (!amount || Number.isNaN(amount) || amount <= 0) {
        throw new Error('Informe um valor válido para o PIX.');
      }

      const payment = onCreatePix(amount);
      const dataUrl = generateQrDataUrl(payment.qrData, 280, 16);

      setCurrentPix(payment);
      setQrImage(dataUrl);
      setFeedback('PIX gerado com sucesso. Escaneie para efetuar o pagamento.');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o PIX.');
      setFeedback(null);
    }
  };

  const handleWithdrawal = () => {
    try {
      const amount = parseFloat(withdrawValue.replace(',', '.'));
      if (!amount || Number.isNaN(amount) || amount <= 0) {
        throw new Error('Informe um valor válido para saque.');
      }
      onRequestWithdrawal(amount);
      setFeedback('Solicitação de saque registrada. Acompanhe o status abaixo.');
      setError(null);
      setWithdrawValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível solicitar o saque.');
      setFeedback(null);
    }
  };

  return (
    <div className="stack" style={{ gap: isMobile ? 20 : 32 }}>
      <section className="panel-tonal stack" style={{ gap: 24 }}>
        <div className="stack" style={{ gap: 8 }}>
          <h2 style={{ margin: 0 }}>💼 Carteira</h2>
          <p className="text-secondary">Gerencie depósitos rápidos via PIX e retire seus ganhos com segurança.</p>
        </div>

        <div
          className="card-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobile ? 18 : 24 }}
        >
          <div className="panel-tonal panel-tonal--subtle stack" style={{ gap: 16 }}>
            <div className="stack" style={{ gap: 8 }}>
              <h3 style={{ margin: 0 }}>Gerar PIX</h3>
              <p className="text-secondary">Selecione um valor rápido ou personalize para gerar o QR Code.</p>
            </div>

            {presetAmounts.length > 0 && (
              <div className="segmented-collection">
                {presetAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={`segmented-option ${selectedAmount === amount ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedAmount(amount);
                      setCustomAmount('');
                    }}
                  >
                    {currency(amount)}
                  </button>
                ))}
              </div>
            )}

            <div className="stack" style={{ gap: 8 }}>
              <label htmlFor="wallet-custom-amount">Valor personalizado</label>
              <input
                id="wallet-custom-amount"
                type="text"
                placeholder="Ex: 150,00"
                value={customAmount}
                onChange={(event) => {
                  setCustomAmount(event.target.value);
                  setSelectedAmount(null);
                }}
              />
            </div>

            <button type="button" className="button-cta" onClick={handleGeneratePix}>
              Gerar QR Code PIX
            </button>

            {feedback && (
              <div className="alert alert--success">
                <span className="alert__icon" role="img" aria-label="sucesso">✅</span>
                {feedback}
              </div>
            )}
            {error && (
              <div className="alert alert--error">
                <span className="alert__icon" role="img" aria-label="erro">⚠️</span>
                {error}
              </div>
            )}

            {currentPix && qrImage && (
              <div className="qr-wrapper">
                <h4 style={{ margin: 0 }}>QR Code gerado</h4>
                <img src={qrImage} alt="QR Code PIX" width={220} height={220} />
                <p className="text-secondary">Valor: {currency(currentPix.amount)}</p>
                <div style={{ fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--color-text-secondary)' }}>
                  {currentPix.pixLink}
                </div>
                <span className={statusToneClass(currentPix.status)}>{currentPix.status.toUpperCase()}</span>
              </div>
            )}
          </div>

          <div className="panel-tonal panel-tonal--subtle stack" style={{ gap: 16 }}>
            <div className="stack" style={{ gap: 8 }}>
              <h3 style={{ margin: 0 }}>Solicitar saque</h3>
              <p className="text-secondary">Retire seus ganhos para a conta cadastrada.</p>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              <label htmlFor="wallet-withdraw">Valor para saque</label>
              <input
                id="wallet-withdraw"
                type="text"
                placeholder="Ex: 200,00"
                value={withdrawValue}
                onChange={(event) => setWithdrawValue(event.target.value)}
              />
            </div>
            <button type="button" className="button-secondary" onClick={handleWithdrawal}>
              Solicitar saque
            </button>

            <div className="stack" style={{ gap: 12 }}>
              <div className="ui-label-muted">Últimos saques</div>
              {user.wallet.withdrawals.length === 0 && (
                <div className="empty-state">Nenhuma solicitação de saque registrada.</div>
              )}
              {user.wallet.withdrawals.slice(0, 4).map((withdrawal) => (
                <div key={withdrawal.id} className="list-glow__item">
                  <div className="stack" style={{ gap: 6, alignItems: 'flex-start' }}>
                    <strong>{currency(withdrawal.amount)}</strong>
                    <span className="text-muted">{formatDateTime(withdrawal.createdAt)}</span>
                  </div>
                  <span className={statusToneClass(withdrawal.status)}>{withdrawal.status.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="panel-tonal stack" style={{ gap: 16 }}>
        <h3 style={{ margin: 0 }}>Histórico recente</h3>
        {user.wallet.transactions.length === 0 && (
          <div className="empty-state">Nenhuma movimentação até o momento.</div>
        )}
        <div className="list-glow">
          {user.wallet.transactions.slice(0, 6).map((transaction) => (
            <div key={transaction.id} className="list-glow__item">
              <div className="stack" style={{ gap: 6, alignItems: 'flex-start' }}>
                <strong>{currency(transaction.amount)}</strong>
                <span className="text-muted">{formatDateTime(transaction.createdAt)}</span>
                <span className="text-secondary">
                  {transaction.description ?? 'Movimentação de carteira'}
                </span>
              </div>
              <div className="stack" style={{ gap: 6, alignItems: 'flex-end' }}>
                <span className="badge-chip">{transaction.type.replace('affiliate', 'afiliado')}</span>
                <span className={statusToneClass(transaction.status)}>{transaction.status.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

interface AffiliatesTabProps {
  user: PlatformUser;
  users: Record<string, PlatformUser>;
  commission: AffiliateCommissionSettings;
  isMobile: boolean;
}

const AffiliatesTab: React.FC<AffiliatesTabProps> = ({ user, users, commission, isMobile }) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const directReferrals = useMemo(
    () => user.affiliate.directReferrals.map((id) => users[id]).filter(Boolean),
    [user.affiliate.directReferrals, users],
  );

  const indirectReferrals = useMemo(
    () => user.affiliate.indirectReferrals.map((id) => users[id]).filter(Boolean),
    [user.affiliate.indirectReferrals, users],
  );

  const inviteLink = useMemo(() => {
    if (typeof window === 'undefined') {
      return `https://drift.to/${user.affiliate.code}`;
    }
    return `${window.location.origin}?invite=${user.affiliate.code}`;
  }, [user.affiliate.code]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyFeedback('Link copiado!');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      setCopyFeedback('Não foi possível copiar o link.');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  return (
    <div className="stack" style={{ gap: isMobile ? 20 : 24 }}>
      <section className="panel-tonal stack" style={{ gap: 20 }}>
        <div className="stack" style={{ gap: 8 }}>
          <h2 style={{ margin: 0 }}>🤝 Rede de Afiliados</h2>
          <p className="text-secondary">Compartilhe seu link exclusivo e ganhe comissões em dois níveis.</p>
        </div>

        <div className="stack" style={{ gap: 12 }}>
          <label htmlFor="affiliate-link">Seu link premium</label>
          <div className="stack" style={{ gap: 12 }}>
            <input id="affiliate-link" type="text" readOnly value={inviteLink} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button type="button" className="copy-button" onClick={handleCopy}>
                Copiar código
              </button>
              <span className="badge-chip">Nível atual: {user.affiliate.level}</span>
            </div>
          </div>
          {copyFeedback && (
            <div className="alert alert--success">
              <span className="alert__icon" role="img" aria-label="copy">📋</span>
              {copyFeedback}
            </div>
          )}
        </div>

        <div
          className="card-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: isMobile ? 12 : 18 }}
        >
          <AffiliateStat title="Diretos" value={directReferrals.length.toString()} />
          <AffiliateStat title="Indiretos" value={indirectReferrals.length.toString()} />
          <AffiliateStat title="Comissão Nível 1" value={`${commission.level1}%`} />
          <AffiliateStat title="Comissão Nível 2" value={`${commission.level2}%`} />
          <AffiliateStat title="Total Recebido" value={currency(user.affiliate.earnings.total)} />
        </div>
      </section>

      <section className="panel-tonal stack" style={{ gap: 24 }}>
        <div className="stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Indicados diretos</h3>
          {directReferrals.length === 0 ? (
            <div className="empty-state">Nenhum indicado direto até o momento.</div>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {directReferrals.map((ref) => (
                <AffiliateCard key={ref.id} user={ref} level="Nível 1" />
              ))}
            </div>
          )}
        </div>

        <div className="divider-soft"></div>

        <div className="stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Indicados indiretos</h3>
          {indirectReferrals.length === 0 ? (
            <div className="empty-state">Nenhum indicado indireto ainda.</div>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {indirectReferrals.map((ref) => (
                <AffiliateCard key={ref.id} user={ref} level="Nível 2" />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const AffiliateStat: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div className="panel-tonal panel-tonal--subtle stack" style={{ gap: 8, padding: 18 }}>
    <span className="ui-label-muted">{title}</span>
    <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-primary-light)' }}>{value}</span>
  </div>
);

const AffiliateCard: React.FC<{ user: PlatformUser; level: string }> = ({ user, level }) => (
  <div className="list-glow__item">
    <div className="stack" style={{ gap: 4, alignItems: 'flex-start' }}>
      <strong>{user.username}</strong>
      <span className="text-muted">{user.email}</span>
    </div>
    <span className="badge-chip">{level}</span>
  </div>
);

interface LeaderboardTabProps {
  username: string;
  isMobile: boolean;
}

const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ username, isMobile }) => {
  const leaderboard = [
    { rank: 1, name: 'DriftKing', distance: '2847.3', wins: 156 },
    { rank: 2, name: 'SpeedDemon', distance: '2734.8', wins: 134 },
    { rank: 3, name: 'RaceAce', distance: '2698.1', wins: 112 },
    { rank: 4, name: username, distance: '1234.5', wins: 23 },
    { rank: 5, name: 'Novice', distance: '987.2', wins: 8 },
  ];

  const columns = isMobile ? '60px 1fr' : '80px 1fr 160px 160px';

  return (
    <section className="panel-tonal stack" style={{ gap: 20, maxWidth: 840 }}>
      <h2 style={{ margin: 0, textAlign: 'center' }}>🏆 Ranking Global</h2>
      <div className="table-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="table-row table-row--header" style={{ gridTemplateColumns: columns }}>
          <span>#</span>
          <span>Jogador</span>
          {!isMobile && <span style={{ textAlign: 'right' }}>Melhor distância</span>}
          {!isMobile && <span style={{ textAlign: 'right' }}>Vitórias</span>}
        </div>
        {leaderboard.map((player) => {
          const isYou = player.name === username;
          const rankContent = player.rank <= 3 ? (
            <div className={`medallion ${player.rank > 1 ? 'medallion--muted' : ''}`}>
              {['1', '2', '3'][player.rank - 1]}
            </div>
          ) : (
            <span className="badge-chip">#{player.rank}</span>
          );

          return (
            <div
              key={player.rank}
              className={`table-row ${isYou ? 'table-row--highlight' : ''}`}
              style={{ gridTemplateColumns: columns }}
            >
              {rankContent}
              <div className="stack" style={{ gap: 2 }}>
                <strong>{player.name}</strong>
                {isMobile && (
                  <span className="text-muted">{player.distance}m • {player.wins} vitórias</span>
                )}
              </div>
              {!isMobile && (
                <>
                  <div className="metric">
                    <span className="metric__value" style={{ fontSize: '1.1rem' }}>{player.distance}m</span>
                    <span className="metric__label">Distância</span>
                  </div>
                  <div className="metric">
                    <span className="metric__value" style={{ fontSize: '1.1rem' }}>{player.wins}</span>
                    <span className="metric__label">Vitórias</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

interface ProfileTabProps {
  user: PlatformUser;
  isMobile: boolean;
  onLogout: () => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user, isMobile, onLogout }) => {
  const [withdrawAddress, setWithdrawAddressInput] = useState(user.withdrawAddress ?? '');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const setWithdrawalAddress = usePlatformStore((state) => state.setWithdrawalAddress);
  const { wallet, refreshUser: refreshAuthUser } = useAuthStore();

  useEffect(() => {
    setWithdrawAddressInput(user.withdrawAddress ?? '');
  }, [user.withdrawAddress]);

  const handleSaveWithdrawalAddress = () => {
    setWithdrawalAddress(user.id, withdrawAddress.trim());
    refreshAuthUser();
    setSaveMessage('Chave PIX atualizada com sucesso.');
    setTimeout(() => setSaveMessage(null), 2500);
  };

  return (
    <section className="profile-card">
      <div className="profile-card__header">
        <div className="stack" style={{ gap: 6 }}>
          <h2 style={{ margin: 0 }}>👤 Perfil do Jogador</h2>
          <span className="text-secondary">Gerencie seus dados e acompanhe o progresso.</span>
        </div>
        <button
          type="button"
          className="button-secondary"
          style={{ borderColor: 'rgba(255, 107, 129, 0.45)', color: '#ff9aa9' }}
          onClick={onLogout}
        >
          Sair da conta
        </button>
      </div>

      <div className="profile-card__meta">
        <ProfileField label="Usuário" value={user.username} />
        <ProfileField label="Email" value={user.email} />
        <ProfileField label="Saldo atual" value={currency(wallet?.balance ?? 0)} highlight />
        <ProfileField label="Nível de afiliado" value={`Nível ${user.affiliate.level}`} />
      </div>

      <div className="stack" style={{ gap: 12, marginTop: 16 }}>
        <label htmlFor="withdraw-address" className="ui-label-muted">
          Endereço de saque (Chave PIX)
        </label>
        <input
          id="withdraw-address"
          type="text"
          placeholder="ex: meuemail@provedor.com"
          value={withdrawAddress}
          onChange={(event) => setWithdrawAddressInput(event.target.value)}
        />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="button-secondary" onClick={handleSaveWithdrawalAddress}>
            Salvar chave PIX
          </button>
          {saveMessage && (
            <span className="text-secondary" style={{ color: '#3BD6B4' }}>{saveMessage}</span>
          )}
        </div>
      </div>

      <div className="divider-soft" style={{ margin: '16px 0' }}></div>

      <div className="stack" style={{ gap: 12 }}>
        <div className="ui-label-muted">Estatísticas básicas</div>
        <div
          className="card-grid"
          style={{ gridTemplateColumns: isMobile ? 'repeat(2, minmax(120px, 1fr))' : 'repeat(auto-fit, minmax(140px, 1fr))' }}
        >
          <ProfileStat label="Jogos" value="23" />
          <ProfileStat label="Vitórias" value="8" />
          <ProfileStat label="Melhor distância" value="1234.5m" />
          <ProfileStat label="Win Rate" value="34.8%" />
        </div>
      </div>
    </section>
  );
};

const ProfileField: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="stack" style={{ gap: 6 }}>
    <span className="ui-label-muted">{label}</span>
    <div className={`field-block ${highlight ? 'field-block--highlight' : ''}`}>{value}</div>
  </div>
);

const ProfileStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    className="panel-tonal panel-tonal--subtle metric"
    style={{ alignItems: 'center', gap: 4, padding: '14px 12px' }}
  >
    <span className="metric__value" style={{ fontSize: '1.4rem' }}>{value}</span>
    <span className="metric__label" style={{ textAlign: 'center' }}>{label}</span>
  </div>
);

interface AdminTabProps {
  users: Record<string, PlatformUser>;
  adminSettings: AdminSettings;
  onUpdateCommission: (settings: AffiliateCommissionSettings) => void;
  onUpdatePresetAmounts: (amounts: number[]) => void;
  onSetUserRole: (userId: string, role: Role) => void;
  onSetAffiliateLevel: (userId: string, level: number) => void;
  onMarkPixPaymentPaid: (userId: string, paymentId: string) => void;
  onExpirePixPayment: (userId: string, paymentId: string) => void;
  onUpdateWithdrawalStatus: (
    userId: string,
    withdrawalId: string,
    status: WithdrawalStatus,
  ) => void;
  isMobile: boolean;
}

const AdminTab: React.FC<AdminTabProps> = ({
  users,
  adminSettings,
  onUpdateCommission,
  onUpdatePresetAmounts,
  onSetUserRole,
  onSetAffiliateLevel,
  onMarkPixPaymentPaid,
  onExpirePixPayment,
  onUpdateWithdrawalStatus,
  isMobile,
}) => {
  const [commissionForm, setCommissionForm] = useState({
    level1: adminSettings.affiliateCommission.level1.toString(),
    level2: adminSettings.affiliateCommission.level2.toString(),
  });

  const [presetForm, setPresetForm] = useState(
    adminSettings.presetPixAmounts.join(', '),
  );

  const userList = useMemo(
    () => Object.values(users).sort((a, b) => a.username.localeCompare(b.username)),
    [users],
  );

  const pixFeed = useMemo(() =>
    userList
      .flatMap((platformUser) =>
        platformUser.wallet.pixPayments.map((payment) => ({
          payment,
          owner: platformUser,
        })),
      )
      .sort((a, b) => (a.payment.createdAt < b.payment.createdAt ? 1 : -1))
      .slice(0, 8),
  [userList]);

  const withdrawalFeed = useMemo(() =>
    userList
      .flatMap((platformUser) =>
        platformUser.wallet.withdrawals.map((withdrawal) => ({
          withdrawal,
          owner: platformUser,
        })),
      )
      .sort((a, b) => (a.withdrawal.createdAt < b.withdrawal.createdAt ? 1 : -1))
      .slice(0, 8),
  [userList]);

  const depositFeed = useMemo(() =>
    userList
      .flatMap((platformUser) =>
        platformUser.wallet.transactions
          .filter((transaction) => transaction.type === 'deposit')
          .map((transaction) => ({ transaction, owner: platformUser })),
      )
      .sort((a, b) => (a.transaction.createdAt < b.transaction.createdAt ? 1 : -1))
      .slice(0, 8),
  [userList]);

  const handleCommissionSave = () => {
    const level1 = Number.parseFloat(commissionForm.level1);
    const level2 = Number.parseFloat(commissionForm.level2);
    if (Number.isNaN(level1) || Number.isNaN(level2)) {
      return;
    }
    onUpdateCommission({ level1, level2 });
  };

  const handlePresetSave = () => {
    const amounts = presetForm
      .split(',')
      .map((value) => Number.parseFloat(value.trim()))
      .filter((value) => !Number.isNaN(value) && value > 0);
    if (amounts.length > 0) {
      onUpdatePresetAmounts(amounts);
    }
  };

  return (
    <div className="stack" style={{ gap: isMobile ? 20 : 24, maxWidth: 1200, width: '100%' }}>
      <section className="panel-tonal stack" style={{ gap: 20 }}>
        <div className="stack" style={{ gap: 8 }}>
          <h2 style={{ margin: 0 }}>⚙️ Configurações de Comissão</h2>
          <p className="text-secondary">Atualize percentuais e presets disponíveis para os jogadores.</p>
        </div>
        <div className="admin-grid">
          <div className="stack" style={{ gap: 8 }}>
            <label htmlFor="admin-commission-l1">Percentual nível 1 (%)</label>
            <input
              id="admin-commission-l1"
              type="number"
              value={commissionForm.level1}
              onChange={(event) =>
                setCommissionForm((prev) => ({ ...prev, level1: event.target.value }))
              }
            />
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <label htmlFor="admin-commission-l2">Percentual nível 2 (%)</label>
            <input
              id="admin-commission-l2"
              type="number"
              value={commissionForm.level2}
              onChange={(event) =>
                setCommissionForm((prev) => ({ ...prev, level2: event.target.value }))
              }
            />
          </div>
          <div className="stack" style={{ gap: 8, alignSelf: 'flex-end' }}>
            <span className="ui-label-muted">Aplicar alterações</span>
            <button type="button" className="button-cta" onClick={handleCommissionSave}>
              Atualizar comissões
            </button>
          </div>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          <label htmlFor="admin-preset">Valores pré-definidos de PIX</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <input
              id="admin-preset"
              type="text"
              placeholder="Ex: 25, 50, 100"
              value={presetForm}
              onChange={(event) => setPresetForm(event.target.value)}
              style={{ flex: '1 1 260px' }}
            />
            <button type="button" className="button-secondary" onClick={handlePresetSave}>
              Salvar valores
            </button>
          </div>
        </div>
      </section>

      <section className="panel-tonal stack" style={{ gap: 16 }}>
        <div className="stack" style={{ gap: 4 }}>
          <h2 style={{ margin: 0 }}>👥 Usuários</h2>
          <p className="text-secondary">Gerencie papéis e níveis de afiliado.</p>
        </div>
        <div className="table-card" style={{ overflowX: 'auto' }}>
          <table className="table-compact" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Email</th>
                <th>Saldo</th>
                <th>Nível afiliado</th>
                <th>Papel</th>
                <th>Código</th>
              </tr>
            </thead>
            <tbody>
              {userList.map((platformUser) => (
                <tr key={platformUser.id}>
                  <td>{platformUser.username}</td>
                  <td>{platformUser.email}</td>
                  <td>{currency(platformUser.wallet.balance)}</td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      value={platformUser.affiliate.level}
                      onChange={(event) =>
                        onSetAffiliateLevel(
                          platformUser.id,
                          Number.parseInt(event.target.value, 10) || 1,
                        )
                      }
                      style={{ width: 90 }}
                    />
                  </td>
                  <td>
                    <select
                      value={platformUser.role}
                      onChange={(event) =>
                        onSetUserRole(platformUser.id, event.target.value as Role)
                      }
                      style={{ width: 140 }}
                    >
                      <option value="user">Usuário</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className="badge-chip">{platformUser.affiliate.code}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel-tonal stack" style={{ gap: 16 }}>
        <div className="stack" style={{ gap: 4 }}>
          <h2 style={{ margin: 0 }}>📥 Depósitos PIX</h2>
          <p className="text-secondary">Acompanhe pagamentos gerados e atualize seus status.</p>
        </div>
        {pixFeed.length === 0 ? (
          <div className="empty-state">Nenhum pedido PIX registrado.</div>
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            {pixFeed.map(({ payment, owner }) => (
              <div key={payment.id} className="list-glow__item" style={{ alignItems: 'flex-start' }}>
                <div className="stack" style={{ gap: 6, maxWidth: '60%' }}>
                  <strong>{owner.username}</strong>
                  <span className="text-muted">{formatDateTime(payment.createdAt)}</span>
                  <span className="text-secondary">{currency(payment.amount)}</span>
                  <span className="text-muted" style={{ wordBreak: 'break-all' }}>{payment.pixLink}</span>
                </div>
                <div className="stack" style={{ gap: 8, alignItems: 'flex-end' }}>
                  <span className={statusToneClass(payment.status === 'paid' ? 'completed' : payment.status === 'pending' ? 'pending' : 'cancelled')}>
                    {payment.status.toUpperCase()}
                  </span>
                  {payment.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="button-secondary button-secondary--success"
                        onClick={() => onMarkPixPaymentPaid(owner.id, payment.id)}
                      >
                        Marcar como pago
                      </button>
                      <button
                        type="button"
                        className="button-secondary button-secondary--danger"
                        onClick={() => onExpirePixPayment(owner.id, payment.id)}
                      >
                        Expirar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel-tonal stack" style={{ gap: 16 }}>
        <div className="stack" style={{ gap: 4 }}>
          <h2 style={{ margin: 0 }}>📤 Saques</h2>
          <p className="text-secondary">Gerencie solicitações de retirada pendentes.</p>
        </div>
        {withdrawalFeed.length === 0 ? (
          <div className="empty-state">Nenhuma solicitação de saque registrada.</div>
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            {withdrawalFeed.map(({ withdrawal, owner }) => (
              <div key={withdrawal.id} className="list-glow__item" style={{ alignItems: 'flex-start' }}>
                <div className="stack" style={{ gap: 6 }}>
                  <strong>{owner.username}</strong>
                  <span className="text-muted">{formatDateTime(withdrawal.createdAt)}</span>
                  <span className="text-secondary">{currency(withdrawal.amount)}</span>
                </div>
                <div className="stack" style={{ gap: 8, alignItems: 'flex-end' }}>
                  <span className={statusToneClass(withdrawal.status)}>{withdrawal.status.toUpperCase()}</span>
                  {withdrawal.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="button-secondary button-secondary--success"
                        onClick={() => onUpdateWithdrawalStatus(owner.id, withdrawal.id, 'completed')}
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        className="button-secondary button-secondary--danger"
                        onClick={() => onUpdateWithdrawalStatus(owner.id, withdrawal.id, 'cancelled')}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel-tonal stack" style={{ gap: 16 }}>
        <div className="stack" style={{ gap: 4 }}>
          <h2 style={{ margin: 0 }}>📊 Depósitos recentes</h2>
          <p className="text-secondary">Últimas entradas confirmadas na plataforma.</p>
        </div>
        {depositFeed.length === 0 ? (
          <div className="empty-state">Nenhum depósito registrado.</div>
        ) : (
          <div className="list-glow">
            {depositFeed.map(({ transaction, owner }) => (
              <div key={transaction.id} className="list-glow__item">
                <div className="stack" style={{ gap: 4 }}>
                  <strong>{owner.username}</strong>
                  <span className="text-muted">{formatDateTime(transaction.createdAt)}</span>
                </div>
                <div className="metric">
                  <span className="metric__value" style={{ fontSize: '1.1rem' }}>{currency(transaction.amount)}</span>
                  <span className="metric__label">Depósito</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const statusToneClass = (status: string) => {
  switch (status) {
    case 'completed':
    case 'paid':
      return 'tag-status tag-status--paid';
    case 'pending':
      return 'tag-status tag-status--pending';
    case 'cancelled':
    case 'expired':
    case 'rejected':
      return 'tag-status tag-status--rejected';
    default:
      return 'tag-status';
  }
};
