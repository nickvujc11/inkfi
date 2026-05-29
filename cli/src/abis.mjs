export const wopnAbi = [
  { type: "function", name: "deposit", stateMutability: "payable", inputs: [], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
];

export const articleNftAbi = [
  { type: "function", name: "publish", stateMutability: "nonpayable", inputs: [{ name: "contentURI", type: "string" }, { name: "contentHash", type: "bytes32" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "writerOf", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "nextId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
];

export const vaultAbi = [
  { type: "function", name: "stake", stateMutability: "nonpayable", inputs: [{ name: "articleId", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "unstake", stateMutability: "nonpayable", inputs: [{ name: "articleId", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [{ name: "articleId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "pendingReward", stateMutability: "view", inputs: [{ name: "articleId", type: "uint256" }, { name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalStaked", stateMutability: "view", inputs: [{ name: "articleId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "userInfo", stateMutability: "view", inputs: [{ name: "articleId", type: "uint256" }, { name: "user", type: "address" }], outputs: [{ name: "staked", type: "uint128" }, { name: "rewardDebt", type: "uint128" }, { name: "pending", type: "uint128" }] },
];

export const routerAbi = [
  { type: "function", name: "tipNative", stateMutability: "payable", inputs: [{ name: "articleId", type: "uint256" }, { name: "memo", type: "string" }], outputs: [] },
  { type: "function", name: "tipWOPN", stateMutability: "nonpayable", inputs: [{ name: "articleId", type: "uint256" }, { name: "amount", type: "uint256" }, { name: "memo", type: "string" }], outputs: [] },
];

export const streamAbi = [
  { type: "function", name: "open", stateMutability: "nonpayable", inputs: [{ name: "recipient", type: "address" }, { name: "deposit", type: "uint256" }, { name: "ratePerSecond", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "fund", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "cancel", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "withdrawable", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "remaining", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "streams", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ name: "sender", type: "address" }, { name: "recipient", type: "address" }, { name: "deposited", type: "uint128" }, { name: "withdrawn", type: "uint128" }, { name: "ratePerSecond", type: "uint128" }, { name: "startedAt", type: "uint64" }, { name: "stoppedAt", type: "uint64" }] },
];
