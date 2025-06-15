import { useCallback, useEffect, useState } from "react";
import { useERC20Contract } from "../useERC20Contract";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectTokenDetail,
  setTokenDetail,
} from "../../store/slices/prepareSlice";
import { ethers } from "ethers";
import { getFactoryAddressByChain } from "../../utils/getContractAddressByChain";

export const useTokenApproval = (tokenAddress: string) => {
  const { address } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  // const [approvalStatus, setApprovalStatus] = useState<"default" | "success" | "failed">("default");
  const erc20Contract = useERC20Contract(true, tokenAddress);
  const [isLoadingApproval, setIsLoadingApproval] = useState(false);

  // const errorDecoder = ErrorDecoder.create()
  const approveTransfer = useCallback(
    async (amount: string) => {
      if (!erc20Contract) {
        toast.error("ERC20 Contract not found");
        return;
      }
      if (!address) {
        toast.error("Connect your wallet!");
        return;
      }
      if (!chainId) {
        toast.error("Invalid Chain");
        return;
      }

      try {
        setIsLoadingApproval(true);
        // console.log("here", amount);

        const _amount = BigInt(amount);

        console.log("approve: ", _amount);

        console.log("approvin in process...");

        const factoryAddress = getFactoryAddressByChain(chainId);

        const tx = await erc20Contract.approve(
          factoryAddress,
          _amount,
          {
            gasLimit: 1000000,
          }
        );
        const reciept = await tx.wait();
        if (reciept.status === 1) {
          return true;
        }
      } catch (error) {
        console.log(error);
        toast.error("Approval failed");
        return false;
      } finally {
        setIsLoadingApproval(false);
      }
    },
    [erc20Contract, address, chainId]
  );

  return { approveTransfer, isLoadingApproval };
};

export interface ITokenDetails {
  name: string;
  symbol: string;
  decimals: number;
}

// works on #Sepolia and #Kaia, but not #base n #lisk, why?
// when I switch to base, i keep getting "Chain switch error"

export const useTokenDetail = (tokenAddress: string) => {
  const [isLoadingDetails, setisLoadingDetails] = useState(false);
  // const [tokenDetails, setTokenDetails] = useState<ITokenDetails | null>(null);
  const readOnlyERC20Contract = useERC20Contract(false, tokenAddress);
  const [errorTxt, setErrorTxt] = useState("");
  const { chainId } = useAppKitNetwork();

  const dispatch = useAppDispatch();

  const fetchDetails = useCallback(async () => {
    if (!readOnlyERC20Contract) {
      console.log("ERC20 contract found");
      dispatch(setTokenDetail(null));
      return;
    }
    if (!chainId) {
      console.log("Invalid chain");
      dispatch(setTokenDetail(null));
      return;
    }
    if (!tokenAddress) {
      console.log("Invalid Token Address");
      dispatch(setTokenDetail(null));
      return;
    }
    try {
      setisLoadingDetails(true);
      console.log("fetching details2...");
      const name = await readOnlyERC20Contract.name();
      const decimals = await readOnlyERC20Contract.decimals();
      const symbol = await readOnlyERC20Contract.symbol();

      console.log({ name, decimals, symbol });
      console.log("Done fetching details2...");
      const metadata = { name, decimals: Number(decimals), symbol };
      dispatch(setTokenDetail(metadata));
    } catch (error) {
      dispatch(setTokenDetail(null));
      setErrorTxt("Invalid Token");
      console.log("Invalid Token");
      console.log(error);
    } finally {
      setisLoadingDetails(false);
    }
  }, [readOnlyERC20Contract, tokenAddress, chainId, dispatch]);

  const fetchDetailsWithoutRedux = useCallback(async () => {
    if (!readOnlyERC20Contract) {
      console.log("ERC20 contract found");
      return null;
    }
    if (!chainId) {
      console.log("Invalid chain");
      return null;
    }
    if (!tokenAddress) {
      console.log("Invalid Token Address");
      return null;
    }
    try {
      setisLoadingDetails(true);
      console.log("fetching details2...");
      const name = await readOnlyERC20Contract.name();
      const decimals = await readOnlyERC20Contract.decimals();
      const symbol = await readOnlyERC20Contract.symbol();

      console.log({ name, decimals, symbol });
      console.log("Done fetching details2...");
      const metadata = { name, decimals: Number(decimals), symbol };
      return metadata;
    } catch (error) {
      setErrorTxt("Invalid Token");
      console.log("Invalid Token");
      console.log(error);
      return null;
    } finally {
      setisLoadingDetails(false);
    }
  }, [readOnlyERC20Contract, tokenAddress, chainId, dispatch]);

  return { isLoadingDetails, fetchDetails, errorTxt, fetchDetailsWithoutRedux };
};

// Work on this nextUp
export const useTokenBalance = (tokenAddress: string) => {
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [isLoadingBalance, setisLoadingBalance] = useState(false);

  const { address } = useAppKitAccount();
  const readOnlyERC20Contract = useERC20Contract(false, tokenAddress);

  const tokenDetail = useAppSelector(selectTokenDetail);

  const fetchBalance = useCallback(async () => {
    if (!readOnlyERC20Contract) {
      setTokenBalance(null);
      return;
    }
    if (!address) {
      setTokenBalance(null);
      return;
    }
    if (!tokenAddress) {
      console.log("Invalid Token Address");
      return;
    }
    try {
      setisLoadingBalance(true);
      const bal = await readOnlyERC20Contract.balanceOf(address);
      console.log(bal);

      setTokenBalance(ethers.formatUnits(bal, tokenDetail?.decimals));
    } catch (error) {
      setTokenBalance(null);
      console.log("An error occurred: ", error);
      return;
    } finally {
      setisLoadingBalance(false);
    }
  }, [readOnlyERC20Contract, address, tokenAddress, tokenDetail?.decimals]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance, tokenAddress]);

  return { tokenBalance, isLoadingBalance };
};
