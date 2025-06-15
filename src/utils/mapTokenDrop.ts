import { IDropComp } from "../interfaces/drop";
import { formatToDDMMYYYY } from "./getPaddedDate";

export const mapTokenDrops = (dropsData: any[]): IDropComp[] => {
  return dropsData.map((drop) => ({
    name: drop.name,
    creator: drop.creatorAddress,
    creationDate: formatToDDMMYYYY(new Date(drop.creationTime * 1000)),
    totalRewardPool: drop.totalClaimabletoken,
    totalRewardClaimed: drop.totalClaimedtoken,
    totalParticipants: drop.totalClaimable,
    totalClaims: drop.totalClaimed,
    contractAddress: drop.address,
    hasUserClaimed: drop.hasUserClaimedAirdrop,
    endDate: drop.endTime
      ? formatToDDMMYYYY(new Date(drop.endTime * 1000))
      : undefined,
    tokenContractAddress: drop.tokenContractAddress,
  }));
};
