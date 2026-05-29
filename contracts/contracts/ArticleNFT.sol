// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title  ArticleNFT
/// @notice Every published article is an NFT owned by its writer.
///         The token URI points to off-chain content (IPFS/Arweave/HTTP).
///         The writer address is the immutable author of record and the
///         beneficiary of tips and stream subscriptions.
/// @dev    Soulbound by default (non-transferable) to prevent authorship
///         laundering. The writer can mint new versions but cannot transfer
///         existing ones.
contract ArticleNFT is ERC721, Ownable {
    struct Article {
        address writer;
        uint64 createdAt;
        uint32 version;
        string contentURI; // ipfs://... or https://...
        bytes32 contentHash; // sha256 of canonical content
    }

    error Soulbound();
    error NotWriter();
    error EmptyURI();

    uint256 public nextId;
    mapping(uint256 => Article) public articles;

    event ArticlePublished(
        uint256 indexed id,
        address indexed writer,
        string contentURI,
        bytes32 contentHash
    );
    event ArticleVersioned(
        uint256 indexed id,
        uint32 indexed version,
        string contentURI,
        bytes32 contentHash
    );

    constructor() ERC721("InkFi Article", "INKART") Ownable(msg.sender) {}

    /// @notice Publish a new article. Mints an NFT to the caller (writer).
    function publish(
        string calldata contentURI,
        bytes32 contentHash
    ) external returns (uint256 id) {
        if (bytes(contentURI).length == 0) revert EmptyURI();
        id = ++nextId;
        articles[id] = Article({
            writer: msg.sender,
            createdAt: uint64(block.timestamp),
            version: 1,
            contentURI: contentURI,
            contentHash: contentHash
        });
        _safeMint(msg.sender, id);
        emit ArticlePublished(id, msg.sender, contentURI, contentHash);
    }

    /// @notice Push a new version of an article. Only the original writer can.
    function pushVersion(
        uint256 id,
        string calldata contentURI,
        bytes32 contentHash
    ) external {
        Article storage a = articles[id];
        if (a.writer != msg.sender) revert NotWriter();
        if (bytes(contentURI).length == 0) revert EmptyURI();
        a.version += 1;
        a.contentURI = contentURI;
        a.contentHash = contentHash;
        emit ArticleVersioned(id, a.version, contentURI, contentHash);
    }

    function tokenURI(
        uint256 id
    ) public view override returns (string memory) {
        _requireOwned(id);
        return articles[id].contentURI;
    }

    function writerOf(uint256 id) external view returns (address) {
        return articles[id].writer;
    }

    /// @dev Soulbound: block transfers, allow only mint.
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }
}
