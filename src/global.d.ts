interface Window {
  solana?: {
    connect: () => Promise<void>;
    disconnect: () => void;
    publicKey: {
      toString: () => string;
    };
  };
} 