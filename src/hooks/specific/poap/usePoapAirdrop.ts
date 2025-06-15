import { ErrorDecoder } from "ethers-decode-error";
import { usePOAPDropContract } from "../../useContracts";
import { toast } from "react-toastify";
import { useCallback, useState } from "react";

export const usePoapDropFunctions = (poapContractAddress: string) => {
  const poapDropContract = usePOAPDropContract(true, poapContractAddress);
  const errorDecoder = ErrorDecoder.create();

  const [isMinting, setIsMinting] = useState(false);

  const mintPoap = useCallback(async (): Promise<{
    success: boolean;
    transactionHash: string | null;
  }> => {
    if (!poapDropContract) {
      toast.error("PoapDrop Contract not found");
      return { success: false, transactionHash: null };
    }

    // @note get this merkleproof from the backend server (using the contract address and user address)
    const merkleProof = [
      "0x708e7cb9a75ffb24191120fba1c3001faa9078147150c6f2747569edbadee751",
      "0x8cdd6608c14a222369d97956b504f94500a33c673fd156f8f2da7f980260c91c",
      "0x79ec436321e0ee4d3657f6b4c44573e6af12266adc6fdb29f3f7de915ce4975d",
    ];

    try {
      setIsMinting(true);

      const tx = await poapDropContract["claimAirdrop(bytes32[])"](merkleProof);

      const reciept = await tx.wait();
      return { success: reciept.status === 1, transactionHash: tx.hash };
    } catch (error) {
      const decodedError = await errorDecoder.decode(error);
      console.error("Mint failed:", decodedError);
      toast.error("Mint failed");
      return { success: false, transactionHash: null };
    } finally {
      setIsMinting(false);
    }
  }, [poapDropContract]);

  return {
    mintPoap,
    isMinting,
  };
};
