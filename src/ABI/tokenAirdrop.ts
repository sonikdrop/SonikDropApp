export const TOKEN_AIRDROP_ABI = [
  // Read/view functions
  "function merkleRoot() view returns (bytes32)",
  "function creationTime() view returns (uint256)",
  "function name() view returns (string)",
  "function owner() view returns (address)",
  "function tokenAddress() view returns (address)",
  "function nftAddress() view returns (address)",
  "function isTimeLocked() view returns (bool)",
  "function hasOwnerWithdrawn() view returns (bool)",
  "function hasUserClaimedAirdrop(address user) view returns (bool)",
  "function hasAirdropTimeEnded() view returns (bool)",
  "function getContractBalance() view returns (uint256)",
  "function checkEligibility(uint256 _amount, bytes32[] calldata _merkleProof) view returns (bool)",
  "function totalOutputTokens() view returns (uint256)",
  `function getDropInfo(address user) view returns (
   string _name,
   address creatorAddress,
   uint256 totalClaimed,
   uint256 totalClaimable,
   uint256 totalClaimedtoken,
   uint256 totalClaimabletoken,
   uint256 _creationTime,
   uint256 _endtime,
   bool _hasOwnerWithdrawn,
   bool _hasUserClaimedAirdrop,
   address _nftAddress,
   address _tokenAddress
 )`,

  // Write/public/external functions
  "function claimAirdrop(uint256 _amount, bytes32[] calldata _merkleProof) external",
  "function claimAirdrop(uint256 _amount, bytes32[] calldata _merkleProof, uint256 _tokenId) public",
  "function withdrawLeftOverToken() external",
  "function fundAirdrop(uint256 _amount) external",
  "function updateNftRequirement(address _newNft) external",
  "function turnOffNftRequirement() external",
  "function updateClaimTime(uint256 _claimTime) external",
];
