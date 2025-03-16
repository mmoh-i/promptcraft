interface Window {
  solana?: {
    connect: () => Promise<void>;
    disconnect: () => void;
    publicKey: {
      toString: () => string;
    };
  };
  solflare?: {
    connect: () => Promise<void>;
    disconnect: () => void;
    publicKey: {
      toString: () => string;
    };
  };
  backpack?: {
    connect: () => Promise<void>;
    disconnect: () => void;
    publicKey: {
      toString: () => string;
    };
  };
} 