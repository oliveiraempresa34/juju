import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuth';
import { CreditCardIcon, ClockIcon } from './icons/Icons';

interface DepositData {
  pixCode: string;
  qrCode: string;
  amount: number;
  transactionId: string;
  expiresAt: number;
}

export const WalletPanel: React.FC = () => {
  const { user, wallet, refreshWallet } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState<string>('10');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositData, setDepositData] = useState<DepositData | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [pixExpired, setPixExpired] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const paymentCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadWalletData();
    }
  }, [user]);

  useEffect(() => {
    // Cleanup intervals on unmount
    return () => {
      if (paymentCheckInterval.current) {
        clearInterval(paymentCheckInterval.current);
      }
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      if (user?.id) {
        await refreshWallet();
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    setTimeRemaining(300);
    setPixExpired(false);

    timerInterval.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setPixExpired(true);
          setCheckingPayment(false);
          if (paymentCheckInterval.current) {
            clearInterval(paymentCheckInterval.current);
          }
          if (timerInterval.current) {
            clearInterval(timerInterval.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount.replace(',', '.'));
    if (isNaN(amount) || amount < 10) {
      alert('Valor mínimo para depósito é R$ 10,00');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`https://livemodelo.com/menu/pay_pushpay.php?valor=${amount}`);
      const data = await response.json();

      if (!data.success && !data.pix) {
        throw new Error(data.error || 'Erro ao gerar PIX');
      }

      const pixData: DepositData = {
        pixCode: data.pix || data.pixCode,
        qrCode: data.qr_code_base64 || data.qrCode || '',
        amount: amount,
        transactionId: data.transaction_id || data.transactionId || `TXN${Date.now()}`,
        expiresAt: Date.now() + 300000 // 5 minutes from now
      };

      console.log('[WalletPanel] PIX data received:', {
        hasPixCode: !!pixData.pixCode,
        pixCodeLength: pixData.pixCode?.length,
        pixCodePreview: pixData.pixCode?.substring(0, 50)
      });

      setDepositData(pixData);
      setShowDepositModal(true);
      setTimeRemaining(300);
      setPixExpired(false);
      setCopySuccess(false);
      startPaymentCheck(pixData.transactionId, amount);
      startTimer();
    } catch (error) {
      console.error('Error creating deposit:', error);
      alert(error instanceof Error ? error.message : 'Erro ao gerar PIX. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const startPaymentCheck = (transactionId: string, amount: number) => {
    if (paymentCheckInterval.current) {
      clearInterval(paymentCheckInterval.current);
    }

    setCheckingPayment(true);

    paymentCheckInterval.current = setInterval(async () => {
      try {
        const response = await fetch(`https://livemodelo.com/menu/check_push.php?transaction_id=${transactionId}`);
        const data = await response.json();

        if (data.status === 'PAGO' || data.status === 'paid' || data.paid) {
          // Payment confirmed
          if (paymentCheckInterval.current) {
            clearInterval(paymentCheckInterval.current);
          }
          if (timerInterval.current) {
            clearInterval(timerInterval.current);
          }

          setCheckingPayment(false);
          setShowDepositModal(false);

          // Value comes in cents, convert to reais
          const valueInReais = data.value ? data.value / 100 : amount;

          // Add balance via API
          if (user?.id) {
            await fetch(`/api/users/${user.id}/balance`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: valueInReais, description: 'Depósito via PIX' })
            });
          }

          await refreshWallet();
          alert(`✅ Pagamento confirmado! R$ ${valueInReais.toFixed(2)} adicionado à sua carteira.`);
        }
      } catch (error) {
        console.error('Error checking payment:', error);
      }
    }, 3000); // Check every 3 seconds
  };

  const copyPixCode = async () => {
    if (depositData?.pixCode) {
      try {
        await navigator.clipboard.writeText(depositData.pixCode);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = depositData.pixCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    }
  };

  const handleRegeneratePixCode = () => {
    setShowDepositModal(false);
    setPixExpired(false);
    setCopySuccess(false);
    setTimeout(() => {
      handleDeposit();
    }, 300);
  };

  const handleCloseModal = () => {
    setShowDepositModal(false);
    setCheckingPayment(false);
    setPixExpired(false);
    setCopySuccess(false);
    if (paymentCheckInterval.current) {
      clearInterval(paymentCheckInterval.current);
    }
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return '💳';
      case 'withdrawal': return '🏦';
      case 'affiliate-level1':
      case 'affiliate-level2': return '🤝';
      case 'game-ticket': return '🎮';
      case 'game-reward': return '🏆';
      default: return '💰';
    }
  };

  if (loading) {
    return (
      <div className="panel-tonal">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ marginBottom: '16px' }}>🔄</div>
          <p>Carregando dados da carteira...</p>
        </div>
      </div>
    );
  }

  return (
    <>
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
            <div className="form-group">
              <label style={{ color: 'var(--color-text-primary)', marginBottom: '8px', display: 'block', fontSize: '14px', fontWeight: '600' }}>
                Valor do Depósito (mínimo R$ 10,00):
              </label>
              <input
                type="text"
                value={depositAmount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d,]/g, '');
                  setDepositAmount(value);
                }}
                placeholder="Digite o valor (ex: 10,00)"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '2px solid rgba(147, 51, 234, 0.3)',
                  background: 'rgba(17, 23, 35, 0.6)',
                  color: '#FFFFFF',
                  fontSize: '18px',
                  textAlign: 'center',
                  fontWeight: '700'
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
                {[10, 25, 50, 100, 250, 500].map(value => (
                  <button
                    key={value}
                    onClick={() => setDepositAmount(value.toString())}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: depositAmount === value.toString() ? '2px solid #9333ea' : '2px solid rgba(147, 51, 234, 0.3)',
                      background: depositAmount === value.toString() ? 'rgba(147, 51, 234, 0.2)' : 'rgba(30, 58, 138, 0.15)',
                      color: depositAmount === value.toString() ? '#FFFFFF' : 'var(--color-text-primary)',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: depositAmount === value.toString() ? '0 0 12px rgba(147, 51, 234, 0.5)' : 'none'
                    }}
                    className="button-secondary"
                  >
                    R$ {value}
                  </button>
                ))}
              </div>
            </div>

            <button className="button-cta" onClick={handleDeposit} disabled={loading || checkingPayment} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              {checkingPayment ? <><ClockIcon size={20} color="#FFF" /> Aguardando Pagamento...</> : <><CreditCardIcon size={20} color="#FFF" /> Depositar via PIX</>}
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
              {wallet.transactions.map((transaction) => (
                <div key={transaction.id} className="list-glow__item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '1.5rem' }}>
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                        {transaction.description || transaction.type}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        {formatDate(transaction.createdAt)}
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
                      <div className={`badge-chip ${transaction.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
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

      {/* Deposit Modal */}
      {showDepositModal && depositData && (
        <div className="modal-overlay-wallet" onClick={handleCloseModal}>
          <div className="modal-content-wallet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-wallet">
              <h2>💳 Depósito via PIX</h2>
              <button className="modal-close-wallet" onClick={handleCloseModal}>×</button>
            </div>

            <div className="modal-body-wallet">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: '700', color: '#9333ea', marginBottom: '8px' }}>
                  {formatCurrency(depositData.amount)}
                </div>

                {/* Timer Display */}
                {!pixExpired && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '8px 20px',
                    background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(79, 70, 229, 0.15) 100%)',
                    borderRadius: '50px',
                    border: '2px solid rgba(147, 51, 234, 0.3)',
                    marginTop: '8px'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#9333ea" strokeWidth="2"/>
                      <path d="M12 6V12L16 14" stroke="#9333ea" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span style={{
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      color: timeRemaining < 60 ? '#ef4444' : '#9333ea',
                      fontFamily: 'monospace',
                      letterSpacing: '0.05em'
                    }}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                )}

                {pixExpired && (
                  <div style={{
                    color: '#ef4444',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    marginTop: '8px'
                  }}>
                    ⚠️ QR Code expirado
                  </div>
                )}
              </div>

              {!pixExpired && (
                <>
                  <div className="qr-container">
                    {depositData.pixCode ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&bgcolor=FFFFFF&data=${encodeURIComponent(depositData.pixCode)}`}
                        alt="QR Code PIX"
                        className="qr-image"
                        onError={(e) => {
                          console.error('Failed to load QR code image');
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => console.log('QR code loaded successfully')}
                      />
                    ) : (
                      <div style={{
                        width: '280px',
                        height: '280px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '12px'
                      }}>
                        Carregando QR Code...
                      </div>
                    )}
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '12px', textAlign: 'center' }}>
                      Escaneie o QR Code com seu app do banco
                    </p>
                  </div>

                  <div style={{ marginTop: '24px' }}>
                    <label style={{ fontWeight: '600', color: '#FFFFFF', marginBottom: '10px', display: 'block', fontSize: '0.95rem' }}>
                      Ou copie o código PIX:
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        value={depositData.pixCode}
                        readOnly
                        style={{
                          flex: 1,
                          padding: '14px',
                          borderRadius: '10px',
                          border: '2px solid rgba(147, 51, 234, 0.4)',
                          background: 'rgba(17, 23, 35, 0.8)',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          fontWeight: '600'
                        }}
                      />
                      <button
                        className="button-copy-pix"
                        onClick={copyPixCode}
                        style={{
                          background: copySuccess ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {copySuccess ? '✓ Copiado!' : '📋 Copiar'}
                      </button>
                    </div>
                  </div>

                  {/* Payment Status */}
                  <div className="payment-status">
                    {checkingPayment && !pixExpired && (
                      <div className="status-checking">
                        <div className="spinner-wallet"></div>
                        <span>Verificando pagamento...</span>
                      </div>
                    )}
                  </div>

                  <div className="info-box-wallet">
                    <h4 style={{ margin: '0 0 10px 0', color: '#9333ea', fontSize: '0.95rem', fontWeight: '700' }}>
                      ℹ️ Instruções
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                      <li>O pagamento será processado automaticamente</li>
                      <li>O valor será creditado em até 5 minutos</li>
                      <li>Guarde o comprovante de pagamento</li>
                      <li>Este QR Code expira em 5 minutos</li>
                    </ul>
                  </div>
                </>
              )}

              {/* Regenerate Button when expired */}
              {pixExpired && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button
                    className="button-cta"
                    onClick={handleRegeneratePixCode}
                    style={{ width: '100%', padding: '16px', fontSize: '1.05rem', fontWeight: '700' }}
                  >
                    🔄 Gerar Novo PIX
                  </button>
                  <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Clique para gerar um novo código PIX
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .modal-overlay-wallet {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content-wallet {
          background: linear-gradient(135deg, rgba(26, 26, 40, 0.98) 0%, rgba(17, 23, 35, 0.98) 100%);
          border-radius: 20px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow:
            0 25px 50px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(147, 51, 234, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-header-wallet {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid rgba(147, 51, 234, 0.2);
        }

        .modal-header-wallet h2 {
          margin: 0;
          color: #FFFFFF;
          font-size: 1.4rem;
          font-weight: 700;
        }

        .modal-close-wallet {
          background: rgba(239, 68, 68, 0.1);
          border: 2px solid rgba(239, 68, 68, 0.3);
          font-size: 28px;
          cursor: pointer;
          color: #ef4444;
          padding: 4px 12px;
          width: auto;
          border-radius: 8px;
          transition: all 0.2s ease;
          font-weight: 300;
          line-height: 1;
        }

        .modal-close-wallet:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: #ef4444;
          transform: scale(1.1);
        }

        .modal-body-wallet {
          padding: 24px;
        }

        .qr-container {
          background: rgba(147, 51, 234, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 2px solid rgba(147, 51, 234, 0.3);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          box-shadow:
            inset 0 2px 8px rgba(147, 51, 234, 0.1),
            0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .qr-image {
          width: 220px;
          height: 220px;
          border: 3px solid #9333ea;
          border-radius: 12px;
          background: white;
          padding: 8px;
          box-shadow: 0 8px 20px rgba(147, 51, 234, 0.3);
        }

        .button-copy-pix {
          padding: 14px 24px;
          border-radius: 10px;
          border: none;
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow:
            0 4px 12px rgba(147, 51, 234, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          white-space: nowrap;
        }

        .button-copy-pix:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(147, 51, 234, 0.5);
        }

        .button-copy-pix:active {
          transform: translateY(0);
        }

        .payment-status {
          margin-top: 20px;
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-checking {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 24px;
          background: rgba(147, 51, 234, 0.1);
          border: 2px solid rgba(147, 51, 234, 0.3);
          border-radius: 50px;
          color: #9333ea;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .spinner-wallet {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(147, 51, 234, 0.2);
          border-top-color: #9333ea;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .info-box-wallet {
          margin-top: 20px;
          background: rgba(79, 70, 229, 0.1);
          padding: 18px;
          border-radius: 12px;
          border: 1px solid rgba(79, 70, 229, 0.3);
        }

        .badge-success {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .badge-warning {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        @media (max-width: 640px) {
          .modal-content-wallet {
            margin: 10px;
            max-height: 95vh;
          }

          .qr-image {
            width: 180px;
            height: 180px;
          }

          .modal-header-wallet h2 {
            font-size: 1.2rem;
          }

          .button-copy-pix {
            padding: 14px 16px;
            font-size: 13px;
          }
        }
      `
      }} />
    </>
  );
};
