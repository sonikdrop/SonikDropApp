import { useCallback, useState } from "react";
import {
  useMulticall3Contract,
  useTokenFactoryContract,
} from "../../useContracts";
import { useAppKitAccount } from "@reown/appkit/react";
import { toast } from "react-toastify";
import { ErrorDecoder } from "ethers-decode-error";
import { ITokenDrop } from "../../../interfaces/tokenDrop";
import { ICall, IResult } from "../../../interfaces/multicall";
import { ethers } from "ethers";
import { TOKEN_AIRDROP_ABI } from "../../../ABI/tokenAirdrop";

export const useReadTokenFactoryFunctions = () => {
  const tokenFactoryContract = useTokenFactoryContract();
  const { address } = useAppKitAccount();

  const multicall3Contract = useMulticall3Contract();
  const errorDecoder = ErrorDecoder.create();

  // state
  const [allTokenDropsAddresses, setAllTokenDropsAddresses] = useState<
    string[] | null
  >(null);

  const [allOwnerTokenDropsAddresses, setAllOwnerTokenDropsAddresses] =
    useState<string[] | null>(null);

  const [allTokenDropsDetails, setAllTokenDropsDetails] = useState<
    ITokenDrop[] | null
  >(null);

  const [allOwnerTokenDropsDetails, setAllOwnerTokenDropsDetails] = useState<
    ITokenDrop[] | null
  >(null);

  // loading state
  const [isLoadingOwnerTokenDrops, setLoadingOwnerTokenDrops] = useState(false);
  const [isLoadingAllTokenDrops, setLoadingAllTokenDrops] = useState(false);

  //  functions
  const getOwnerTokenDrops = useCallback(async () => {
    if (!tokenFactoryContract) {
      toast.error("Token Factory Contract not found");
      return;
    }
    const ownerDropsAddresses =
      await tokenFactoryContract.getOwnerSonikDropClones(address);
    setAllOwnerTokenDropsAddresses(ownerDropsAddresses);
  }, [tokenFactoryContract]);

  const getAllTokenDrops = useCallback(async () => {
    if (!tokenFactoryContract) {
      toast.error("Token Factory Contract not found");
      return;
    }
    const allDropAddresses = await tokenFactoryContract.getAllSonikDropClones();
    setAllTokenDropsAddresses(allDropAddresses);
  }, [tokenFactoryContract]);

  const fetchTokenDropDetails = useCallback(
    async (
      dropAddresses: string[],
      setFn: (drops: ITokenDrop[]) => void,
      setLoading: (state: boolean) => void
    ) => {
      if (!multicall3Contract) {
        toast.error("Multicall3 Contract not found");
        return;
      }
      setLoading(true);
      try {
        const iface = new ethers.Interface(TOKEN_AIRDROP_ABI);

        const calls: ICall[] = dropAddresses.map(
          (addr: string): ICall => ({
            target: addr,
            callData: iface.encodeFunctionData("getDropInfo", [address]),
          })
        );

        const results = await multicall3Contract.tryAggregate.staticCall(
          true,
          calls
        );

        const decoded: (ITokenDrop | null)[] = results.map(
          (res: IResult, idx: number): ITokenDrop | null => {
            if (!res.success) {
              console.warn(`Call failed for address: ${dropAddresses[idx]}`);
              return null;
            }

            const [
              name,
              creatorAddress,
              totalClaimed,
              totalClaimable,
              totalClaimedtoken,
              totalClaimabletoken,
              creationTime,
              endTime,
              hasOwnerWithdrawn,
              hasUserClaimedAirdrop,
              nftAddress,
              tokenContractAddress,
            ] = iface.decodeFunctionResult("getDropInfo", res.returnData);

            const men= iface.decodeFunctionResult("getDropInfo", res.returnData);
            console.log("men -> ",men);
            
            return {
              address: dropAddresses[idx],
              name,
              creatorAddress,
              totalClaimed: Number(totalClaimed),
              totalClaimable: Number(totalClaimable),
              totalClaimedtoken: Number(totalClaimedtoken),
              totalClaimabletoken: Number(totalClaimabletoken),
              creationTime: Number(creationTime),
              endTime:
                Number(creationTime) != Number(endTime)
                  ? Number(endTime)
                  : undefined,
              hasOwnerWithdrawn,
              hasUserClaimedAirdrop,
              nftAddress:
                ethers.ZeroAddress != nftAddress ? nftAddress : undefined,
              tokenContractAddress: tokenContractAddress,
            };
          }
        );
        console.log("decoded result: ", decoded);
        setFn(decoded.filter((drop): drop is ITokenDrop => drop !== null));
      } catch (error) {
        const decodedError = await errorDecoder.decode(error);
        toast.error(decodedError.reason);
      } finally {
        setLoading(false);
      }
    },
    [multicall3Contract, address]
  );

  const getOwnerTokenDropsDetails = useCallback(async () => {
    if (!tokenFactoryContract) {
      toast.error("Token Factory Contract not found");
      return;
    }

    const ownerDropAddresses =
      await tokenFactoryContract.getOwnerSonikDropClones(address);
    await fetchTokenDropDetails(
      ownerDropAddresses,
      setAllOwnerTokenDropsDetails,
      setLoadingOwnerTokenDrops
    );
  }, [tokenFactoryContract]);

  const getAllTokenDropsDetails = useCallback(async () => {
    if (!tokenFactoryContract) {
      toast.error("Token Factory Contract not found");
      return;
    }

    const allDropAddresses = await tokenFactoryContract.getAllSonikDropClones();
    await fetchTokenDropDetails(
      allDropAddresses,
      setAllTokenDropsDetails,
      setLoadingAllTokenDrops
    );
  }, [tokenFactoryContract]);

  return {
    getOwnerTokenDrops,
    getAllTokenDrops,
    getAllTokenDropsDetails,
    getOwnerTokenDropsDetails,
    allTokenDropsAddresses,
    allOwnerTokenDropsAddresses,
    allTokenDropsDetails,
    allOwnerTokenDropsDetails,
    isLoadingOwnerTokenDrops,
    isLoadingAllTokenDrops,
  };
};
