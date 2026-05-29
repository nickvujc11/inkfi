"""Minimal ABIs for the InkFi analytics scripts.

Only the views/events that the analytics actually reads are included.
"""

WOPN_ABI = [
    {"type": "function", "name": "totalSupply", "stateMutability": "view",
     "inputs": [], "outputs": [{"type": "uint256"}]},
    {"type": "function", "name": "balanceOf", "stateMutability": "view",
     "inputs": [{"name": "account", "type": "address"}],
     "outputs": [{"type": "uint256"}]},
]

ARTICLE_NFT_ABI = [
    {"type": "function", "name": "nextId", "stateMutability": "view",
     "inputs": [], "outputs": [{"type": "uint256"}]},
    {"type": "function", "name": "writerOf", "stateMutability": "view",
     "inputs": [{"name": "id", "type": "uint256"}],
     "outputs": [{"type": "address"}]},
    {"type": "event", "name": "ArticlePublished", "anonymous": False,
     "inputs": [
         {"indexed": True, "name": "id", "type": "uint256"},
         {"indexed": True, "name": "writer", "type": "address"},
         {"indexed": False, "name": "contentURI", "type": "string"},
         {"indexed": False, "name": "contentHash", "type": "bytes32"},
     ]},
]

VAULT_ABI = [
    {"type": "function", "name": "totalStaked", "stateMutability": "view",
     "inputs": [{"name": "articleId", "type": "uint256"}],
     "outputs": [{"type": "uint256"}]},
    {"type": "event", "name": "Staked", "anonymous": False,
     "inputs": [
         {"indexed": True, "name": "articleId", "type": "uint256"},
         {"indexed": True, "name": "user", "type": "address"},
         {"indexed": False, "name": "amount", "type": "uint256"},
     ]},
    {"type": "event", "name": "RewardNotified", "anonymous": False,
     "inputs": [
         {"indexed": True, "name": "articleId", "type": "uint256"},
         {"indexed": True, "name": "from", "type": "address"},
         {"indexed": False, "name": "amount", "type": "uint256"},
     ]},
]

ROUTER_ABI = [
    {"type": "event", "name": "Tipped", "anonymous": False,
     "inputs": [
         {"indexed": True, "name": "articleId", "type": "uint256"},
         {"indexed": True, "name": "from", "type": "address"},
         {"indexed": True, "name": "writer", "type": "address"},
         {"indexed": False, "name": "total", "type": "uint256"},
         {"indexed": False, "name": "toWriter", "type": "uint256"},
         {"indexed": False, "name": "toStakers", "type": "uint256"},
         {"indexed": False, "name": "toTreasury", "type": "uint256"},
         {"indexed": False, "name": "memo", "type": "string"},
     ]},
]

STREAM_ABI = [
    {"type": "event", "name": "StreamOpened", "anonymous": False,
     "inputs": [
         {"indexed": True, "name": "id", "type": "uint256"},
         {"indexed": True, "name": "sender", "type": "address"},
         {"indexed": True, "name": "recipient", "type": "address"},
         {"indexed": False, "name": "deposit", "type": "uint256"},
         {"indexed": False, "name": "ratePerSecond", "type": "uint256"},
     ]},
    {"type": "function", "name": "streams", "stateMutability": "view",
     "inputs": [{"name": "id", "type": "uint256"}],
     "outputs": [
         {"name": "sender", "type": "address"},
         {"name": "recipient", "type": "address"},
         {"name": "deposited", "type": "uint128"},
         {"name": "withdrawn", "type": "uint128"},
         {"name": "ratePerSecond", "type": "uint128"},
         {"name": "startedAt", "type": "uint64"},
         {"name": "stoppedAt", "type": "uint64"},
     ]},
    {"type": "function", "name": "nextStreamId", "stateMutability": "view",
     "inputs": [], "outputs": [{"type": "uint256"}]},
]
