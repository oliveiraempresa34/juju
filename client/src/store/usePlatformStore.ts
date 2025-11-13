import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'user' | 'admin';

type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'affiliate-level1'
  | 'affiliate-level2'
  | 'game-ticket'
  | 'game-reward';

export type TransactionStatus = 'pending' | 'completed' | 'cancelled';

export type WithdrawalStatus = TransactionStatus;

export type PixPaymentStatus = 'pending' | 'paid' | 'expired';

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  createdAt: string;
  description?: string;
  relatedUserId?: string;
}

export interface PixPaymentRequest {
  id: string;
  amount: number;
  status: PixPaymentStatus;
  qrData: string;
  pixLink: string;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  createdAt: string;
}

export interface AffiliateEarnings {
  level1: number;
  level2: number;
  total: number;
}

export interface AffiliateProfile {
  code: string;
  level: number;
  parentId?: string;
  directReferrals: string[];
  indirectReferrals: string[];
  earnings: AffiliateEarnings;
}

export interface WalletSnapshot {
  balance: number;
  transactions: WalletTransaction[];
  pixPayments: PixPaymentRequest[];
  withdrawals: WithdrawalRequest[];
}

export interface PlatformUser {
  id: string;
  username: string;
  email: string;
  password: string;
  role: Role;
  withdrawAddress?: string;
  wallet: WalletSnapshot;
  affiliate: AffiliateProfile;
}

export interface AffiliateCommissionSettings {
  level1: number;
  level2: number;
}

export interface AdminSettings {
  affiliateCommission: AffiliateCommissionSettings;
  presetPixAmounts: number[];
}

interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
  role?: Role;
  referralCode?: string;
}

interface LoginInput {
  username: string;
  password: string;
}

interface PlatformState {
  users: Record<string, PlatformUser>;
  adminSettings: AdminSettings;

  registerUser: (input: RegisterUserInput) => PlatformUser;
  loginUser: (input: LoginInput) => PlatformUser | null;
  setUserRole: (userId: string, role: Role) => void;
  setAffiliateLevel: (userId: string, level: number) => void;
  updateAffiliateCommission: (settings: AffiliateCommissionSettings) => void;
  setPresetPixAmounts: (amounts: number[]) => void;
  setWithdrawalAddress: (userId: string, address: string) => void;
  chargeGameTicket: (userId: string, amount: number, transactionKey: string) => void;
  rewardGameWinner: (userId: string, amount: number, transactionKey: string) => void;

  createPixPayment: (userId: string, amount: number) => PixPaymentRequest;
  markPixPaymentPaid: (userId: string, paymentId: string) => void;
  expirePixPayment: (userId: string, paymentId: string) => void;
  requestWithdrawal: (userId: string, amount: number) => WithdrawalRequest;
  updateWithdrawalStatus: (
    userId: string,
    withdrawalId: string,
    status: WithdrawalStatus
  ) => void;
}

const generateId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

const generateReferralCode = (username: string) =>
  `${username.slice(0, 3).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

const formatAmount = (amount: number) => amount.toFixed(2);

const createBaseUser = (input: RegisterUserInput): PlatformUser => {
  const userId = generateId('user');
  return {
    id: userId,
    username: input.username,
    email: input.email,
    password: input.password,
    role: input.role ?? 'user',
    withdrawAddress: '',
    wallet: {
      balance: 0,
      transactions: [],
      pixPayments: [],
      withdrawals: [],
    },
    affiliate: {
      code: generateReferralCode(input.username),
      level: 1,
      parentId: undefined,
      directReferrals: [],
      indirectReferrals: [],
      earnings: {
        level1: 0,
        level2: 0,
        total: 0,
      },
    },
  };
};

const createInitialAdminUser = (): PlatformUser => {
  const admin = createBaseUser({
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
  });
  return {
    ...admin,
    affiliate: {
      ...admin.affiliate,
      code: 'ADMIN-01',
      level: 2,
    },
  };
};

const createSeedUser = (
  input: RegisterUserInput,
  initialBalance: number,
  description: string,
): PlatformUser => {
  const user = createBaseUser(input);
  const normalized = Number(formatAmount(Math.max(0, initialBalance)));
  if (normalized > 0) {
    const createdAt = new Date().toISOString();
    user.wallet = {
      ...user.wallet,
      balance: normalized,
      transactions: [
        {
          id: generateId('txn'),
          type: 'deposit',
          amount: normalized,
          status: 'completed',
          createdAt,
          description,
        },
      ],
    };
  }
  return user;
};

const applyAffiliateCommission = (
  users: Record<string, PlatformUser>,
  beneficiaryId: string,
  amount: number,
  type: 'affiliate-level1' | 'affiliate-level2',
  relatedUserId: string,
) => {
  const beneficiary = users[beneficiaryId];
  if (!beneficiary) {
    return;
  }

  const transactionId = generateId('txn');
  const createdAt = new Date().toISOString();

  const updatedTransactions: WalletTransaction[] = [
    {
      id: transactionId,
      type,
      amount,
      status: 'completed',
      createdAt,
      description:
        type === 'affiliate-level1'
          ? 'Comissão - Nível 1'
          : 'Comissão - Nível 2',
      relatedUserId,
    },
    ...beneficiary.wallet.transactions,
  ];

  const updatedEarnings: AffiliateEarnings = {
    level1:
      beneficiary.affiliate.earnings.level1 +
      (type === 'affiliate-level1' ? amount : 0),
    level2:
      beneficiary.affiliate.earnings.level2 +
      (type === 'affiliate-level2' ? amount : 0),
    total: beneficiary.affiliate.earnings.total + amount,
  };

  users[beneficiaryId] = {
    ...beneficiary,
    wallet: {
      ...beneficiary.wallet,
      balance: beneficiary.wallet.balance + amount,
      transactions: updatedTransactions,
    },
    affiliate: {
      ...beneficiary.affiliate,
      earnings: updatedEarnings,
    },
  };
};

const distributeCommissions = (
  users: Record<string, PlatformUser>,
  user: PlatformUser,
  depositAmount: number,
  commissionSettings: AffiliateCommissionSettings,
) => {
  if (!user.affiliate.parentId) {
    return;
  }

  const parent = users[user.affiliate.parentId];
  if (!parent) {
    return;
  }

  const level1Amount =
    (depositAmount * commissionSettings.level1) / 100;
  applyAffiliateCommission(
    users,
    parent.id,
    level1Amount,
    'affiliate-level1',
    user.id,
  );

  if (parent.affiliate.parentId) {
    const grandParent = users[parent.affiliate.parentId];
    if (grandParent) {
      const level2Amount =
        (depositAmount * commissionSettings.level2) / 100;
      applyAffiliateCommission(
        users,
        grandParent.id,
        level2Amount,
        'affiliate-level2',
        user.id,
      );
    }
  }
};

const handleReferralLinking = (
  users: Record<string, PlatformUser>,
  newUser: PlatformUser,
  referralCode?: string,
) => {
  if (!referralCode) {
    return users;
  }

  const referringEntry = Object.values(users).find(
    (candidate) => candidate.affiliate.code === referralCode,
  );

  if (!referringEntry) {
    return users;
  }

  const updatedUsers = { ...users };
  const referringUser = updatedUsers[referringEntry.id];

  const updatedReferringUser: PlatformUser = {
    ...referringUser,
    affiliate: {
      ...referringUser.affiliate,
      directReferrals: [
        ...referringUser.affiliate.directReferrals,
        newUser.id,
      ],
    },
  };

  updatedUsers[referringUser.id] = updatedReferringUser;

  const updatedNewUser: PlatformUser = {
    ...newUser,
    affiliate: {
      ...newUser.affiliate,
      parentId: referringUser.id,
    },
  };

  if (referringUser.affiliate.parentId) {
    const grandParent = updatedUsers[referringUser.affiliate.parentId];
    if (grandParent) {
      updatedUsers[grandParent.id] = {
        ...grandParent,
        affiliate: {
          ...grandParent.affiliate,
          indirectReferrals: [
            ...grandParent.affiliate.indirectReferrals,
            newUser.id,
          ],
        },
      };
    }
  }

  updatedUsers[newUser.id] = updatedNewUser;
  return updatedUsers;
};

const initialAdmin = createInitialAdminUser();
const seedToretto = createSeedUser(
  {
    username: 'Toretto',
    email: 'toretto@example.com',
    password: 'drift123',
  },
  50,
  'Saldo inicial de testes',
);
const seedTinio = createSeedUser(
  {
    username: 'tiniojr',
    email: 'tiniojr@example.com',
    password: 'drift123',
  },
  50,
  'Saldo inicial de testes',
);

export const usePlatformStore = create<PlatformState>()(
  persist(
    (set, get) => ({
      users: {
        [initialAdmin.id]: initialAdmin,
        [seedToretto.id]: seedToretto,
        [seedTinio.id]: seedTinio,
      },
      adminSettings: {
        affiliateCommission: {
          level1: 10,
          level2: 5,
        },
        presetPixAmounts: [25, 50, 100, 250],
      },

      registerUser: (input) => {
        const state = get();
        const usersCopy = { ...state.users };

        const usernameAlreadyExists = Object.values(usersCopy).some(
          (user) => user.username.toLowerCase() === input.username.toLowerCase(),
        );

        if (usernameAlreadyExists) {
          throw new Error('Nome de usuário já está em uso.');
        }

        const newUser = createBaseUser(input);

        const linkedUsers = handleReferralLinking(
          usersCopy,
          newUser,
          input.referralCode,
        );

        linkedUsers[newUser.id] = {
          ...newUser,
          affiliate: {
            ...newUser.affiliate,
            level: input.role === 'admin' ? 2 : 1,
          },
        };

        set({ users: linkedUsers });
        return linkedUsers[newUser.id];
      },

      loginUser: ({ username, password }) => {
        const state = get();
        const foundUser = Object.values(state.users).find(
          (user) =>
            user.username.toLowerCase() === username.toLowerCase() &&
            user.password === password,
        );
        return foundUser ?? null;
      },

      setUserRole: (userId, role) => {
        set((state) => {
          const target = state.users[userId];
          if (!target) {
            return {};
          }

          return {
            users: {
              ...state.users,
              [userId]: {
                ...target,
                role,
              },
            },
          };
        });
      },

      setAffiliateLevel: (userId, level) => {
        set((state) => {
          const target = state.users[userId];
          if (!target) {
            return {};
          }
          return {
            users: {
              ...state.users,
              [userId]: {
                ...target,
                affiliate: {
                  ...target.affiliate,
                  level,
                },
              },
            },
          };
        });
      },

      updateAffiliateCommission: (settings) => {
        set((state) => ({
          adminSettings: {
            ...state.adminSettings,
            affiliateCommission: {
              level1: Math.max(0, settings.level1),
              level2: Math.max(0, settings.level2),
            },
          },
        }));
      },

      setPresetPixAmounts: (amounts) => {
        set((state) => ({
          adminSettings: {
            ...state.adminSettings,
            presetPixAmounts: amounts
              .filter((value) => value > 0)
              .map((value) => Number(formatAmount(value))),
          },
        }));
      },

      setWithdrawalAddress: (userId, address) => {
        set((state) => {
          const target = state.users[userId];
          if (!target) {
            return {};
          }

          return {
            users: {
              ...state.users,
              [userId]: {
                ...target,
                withdrawAddress: address.trim(),
              },
            },
          };
        });
      },

      chargeGameTicket: (userId, amount, transactionKey) => {
        if (amount <= 0) {
          return;
        }

        set((state) => {
          const target = state.users[userId];
          if (!target) {
            throw new Error('Usuário não encontrado para cobrança de ticket.');
          }

          const normalized = Number(formatAmount(amount));
          if (target.wallet.balance < normalized) {
            throw new Error('Saldo insuficiente para a cobrança do ticket.');
          }

          if (target.wallet.transactions.some((entry) => entry.id === transactionKey)) {
            return {};
          }

          const ticketTransaction: WalletTransaction = {
            id: transactionKey,
            type: 'game-ticket',
            amount: normalized,
            status: 'completed',
            createdAt: new Date().toISOString(),
            description: 'Entrada em partida multiplayer'
          };

          return {
            users: {
              ...state.users,
              [userId]: {
                ...target,
                wallet: {
                  ...target.wallet,
                  balance: target.wallet.balance - normalized,
                  transactions: [ticketTransaction, ...target.wallet.transactions]
                }
              }
            }
          };
        });
      },

      rewardGameWinner: (userId, amount, transactionKey) => {
        if (amount <= 0) {
          return;
        }

        set((state) => {
          const target = state.users[userId];
          if (!target) {
            throw new Error('Usuário não encontrado para crédito de prêmio.');
          }

          if (target.wallet.transactions.some((entry) => entry.id === transactionKey)) {
            return {};
          }

          const normalized = Number(formatAmount(amount));
          const rewardTransaction: WalletTransaction = {
            id: transactionKey,
            type: 'game-reward',
            amount: normalized,
            status: 'completed',
            createdAt: new Date().toISOString(),
            description: 'Prêmio de partida multiplayer'
          };

          return {
            users: {
              ...state.users,
              [userId]: {
                ...target,
                wallet: {
                  ...target.wallet,
                  balance: target.wallet.balance + normalized,
                  transactions: [rewardTransaction, ...target.wallet.transactions]
                }
              }
            }
          };
        });
      },

      createPixPayment: (userId, amount) => {
        if (amount <= 0) {
          throw new Error('Valor do PIX deve ser maior que zero.');
        }

        const amountRounded = Number(formatAmount(amount));

        const pixLink = `/pay/push.php?valor=${encodeURIComponent(
          amountRounded.toFixed(2),
        )}`;

        const payment: PixPaymentRequest = {
          id: generateId('pix'),
          amount: amountRounded,
          status: 'pending',
          createdAt: new Date().toISOString(),
          pixLink,
          qrData: pixLink,
        };

        set((state) => {
          const target = state.users[userId];
          if (!target) {
            throw new Error('Usuário não encontrado para gerar PIX.');
          }

          const updatedUser: PlatformUser = {
            ...target,
            wallet: {
              ...target.wallet,
              pixPayments: [payment, ...target.wallet.pixPayments],
            },
          };

          return {
            users: {
              ...state.users,
              [userId]: updatedUser,
            },
          };
        });

        return payment;
      },

      markPixPaymentPaid: (userId, paymentId) => {
        set((state) => {
          const target = state.users[userId];
          if (!target) {
            return {};
          }

          const payment = target.wallet.pixPayments.find(
            (entry) => entry.id === paymentId,
          );
          if (!payment) {
            return {};
          }

          const updatedPayments = target.wallet.pixPayments.map((entry) =>
            entry.id === paymentId
              ? { ...entry, status: 'paid' as const }
              : entry,
          );

          const depositTransaction: WalletTransaction = {
            id: generateId('txn'),
            type: 'deposit',
            amount: payment.amount,
            status: 'completed',
            createdAt: new Date().toISOString(),
            description: 'Depósito via PIX',
          };

          const updatedUser: PlatformUser = {
            ...target,
            wallet: {
              ...target.wallet,
              balance: target.wallet.balance + payment.amount,
              pixPayments: updatedPayments,
              transactions: [
                depositTransaction,
                ...target.wallet.transactions,
              ],
            },
          };

          const updatedUsers = {
            ...state.users,
            [userId]: updatedUser,
          };

          distributeCommissions(
            updatedUsers,
            updatedUser,
            payment.amount,
            state.adminSettings.affiliateCommission,
          );

          return {
            users: updatedUsers,
          };
        });
      },

      expirePixPayment: (userId, paymentId) => {
        set((state) => {
          const target = state.users[userId];
          if (!target) {
            return {};
          }

          const updatedPayments = target.wallet.pixPayments.map((entry) =>
            entry.id === paymentId
              ? { ...entry, status: 'expired' as const }
              : entry,
          );

          return {
            users: {
              ...state.users,
              [userId]: {
                ...target,
                wallet: {
                  ...target.wallet,
                  pixPayments: updatedPayments,
                },
              },
            },
          };
        });
      },

      requestWithdrawal: (userId, amount) => {
        if (amount <= 0) {
          throw new Error('Valor do saque deve ser maior que zero.');
        }

        const normalizedAmount = Number(formatAmount(amount));
        const createdAt = new Date().toISOString();
        const withdrawal: WithdrawalRequest = {
          id: generateId('withdraw'),
          amount: normalizedAmount,
          status: 'pending',
          createdAt,
        };

        set((state) => {
          const target = state.users[userId];
          if (!target) {
            throw new Error('Usuário não encontrado para saque.');
          }

          if (target.wallet.balance < normalizedAmount) {
            throw new Error('Saldo insuficiente para saque.');
          }

          const withdrawalTransaction: WalletTransaction = {
            id: withdrawal.id,
            type: 'withdrawal',
            amount: normalizedAmount,
            status: 'pending',
            createdAt,
            description: 'Solicitação de saque',
          };

          const updatedUser: PlatformUser = {
            ...target,
            wallet: {
              ...target.wallet,
              balance: target.wallet.balance - normalizedAmount,
              withdrawals: [withdrawal, ...target.wallet.withdrawals],
              transactions: [
                withdrawalTransaction,
                ...target.wallet.transactions,
              ],
            },
          };

          return {
            users: {
              ...state.users,
              [userId]: updatedUser,
            },
          };
        });

        return withdrawal;
      },

      updateWithdrawalStatus: (userId, withdrawalId, status) => {
        set((state) => {
          const target = state.users[userId];
          if (!target) {
            return {};
          }

          const withdrawal = target.wallet.withdrawals.find(
            (entry) => entry.id === withdrawalId,
          );
          if (!withdrawal) {
            return {};
          }

          const updatedWithdrawals = target.wallet.withdrawals.map((entry) =>
            entry.id === withdrawalId ? { ...entry, status } : entry,
          );

          const updatedTransactions = target.wallet.transactions.map(
            (entry) =>
              entry.type === 'withdrawal' && entry.id === withdrawalId
                ? { ...entry, status }
                : entry,
          );

          let balance = target.wallet.balance;

          if (status === 'cancelled') {
            balance += withdrawal.amount;
          }

          return {
            users: {
              ...state.users,
              [userId]: {
                ...target,
                wallet: {
                  ...target.wallet,
                  balance,
                  withdrawals: updatedWithdrawals,
                  transactions: updatedTransactions,
                },
              },
            },
          };
        });
      },
    }),
    {
      name: 'platform-storage',
    },
  ),
);

export type { PlatformState };
