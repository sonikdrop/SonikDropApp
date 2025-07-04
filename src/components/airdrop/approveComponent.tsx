import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectCsvToJSONData,
  setAirdropEnd,
  setAirdropStart,
  setCsvToJSONData,
  setOnlyNFTOwnersCanClaim,
} from "../../store/slices/approveSlice";

import { moodVariant } from "../../animations/animation";
import { motion, AnimatePresence } from "framer-motion";
import { useClearFormInput } from "../../hooks/useClearForm";
import {
  selectTokenAddress,
  selectTokenDetail,
  setTokenDetail,
} from "../../store/slices/prepareSlice";
// import { ethers } from "ethers";
import { toast } from "react-toastify";
import { ButtonLoader } from "../icons";
import { CompletedModal } from "../completedModal";
import {
  useTokenApproval,
  useTokenBalance,
} from "../../hooks/specific/useERC20";
import { ethers } from "ethers";
import { useTokenFactoryFunctions } from "../../hooks/specific/token/useTokenAirdropFactory";
import {
  selectAirDropName,
  selectNftAddress,
} from "../../store/slices/settingsSlice";
import axios from "axios";
import Cookies from "js-cookie";
import {
  selectMerkleHash,
  selectMerkleOutput,
  selectNoOfClaimers,
} from "../../store/slices/tokenDropDataSlice";

export function ApproveComponent() {
  const dispatch = useAppDispatch();

  const csvToJSONData = useAppSelector(selectCsvToJSONData);

  const tokenDetail = useAppSelector(selectTokenDetail);
  const tokenAddress = useAppSelector(selectTokenAddress);
  const nftAddress = useAppSelector(selectNftAddress);
  const merkleRoot = useAppSelector(selectMerkleHash);
  const merkleOutput = useAppSelector(selectMerkleOutput);
  const noOfClaimers = useAppSelector(selectNoOfClaimers);
  const name = useAppSelector(selectAirDropName);

  const { tokenBalance, isLoadingBalance } = useTokenBalance(tokenAddress);
  const [totalOutput, setTotalOutput] = useState(0);

  const calculateTotalOutput = useCallback(() => {
    const total = csvToJSONData.reduce((accumulator: number, current: any) => {
      return accumulator + parseFloat(current.amount);
    }, 0);
    setTotalOutput(total);
  }, [csvToJSONData]);

  useEffect(() => {
    calculateTotalOutput();
  }, [calculateTotalOutput]);

  useEffect(() => {
    // setTokenAddress(sessionStorage.getItem("tokenAddress")  as string);
    dispatch(
      setCsvToJSONData(JSON.parse(sessionStorage.getItem("csvData") as string))
    );
    // JSON.stringify({onlyNFTOwnersCanClaim, airdropStart, airdropEnd})
    const settings = JSON.parse(localStorage.getItem("settings") as string);

    if (settings) {
      if (settings.onlyNFTOwnersCanClaim) {
        dispatch(setOnlyNFTOwnersCanClaim(settings.onlyNFTOwnersCanClaim));
      }

      if (settings.airdropStart) {
        dispatch(setAirdropStart(settings.airdropStart));
      }

      if (settings.airdropEnd) {
        dispatch(setAirdropEnd(settings.airdropEnd));
      }
    }
  }, []);

  const { clear } = useClearFormInput();
  const [showModal, setShowModal] = useState(false);
  const { createTokenDrop, creationStatus, isCreating } =
    useTokenFactoryFunctions();

  const { approveTransfer, isLoadingApproval } = useTokenApproval(tokenAddress);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [backendStatus, setbackendStatus] = useState<
    "error" | "success" | "sending" | null
  >(null);
  const [
    storedDeployedAirdropContractAddress,
    setDeployedAirdropContractAddress,
  ] = useState<string | null>(null);

  const approve = async () => {
    // if the drop has been created, but the upload of proofs to the backend fails
    if (creationStatus === "success") {
      // contract already deployed — only retry backend
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
      const token = Cookies.get("token");
      const body_v = {
        proofs: merkleOutput,
        contractAddress: storedDeployedAirdropContractAddress,
      };
      console.log(body_v);
      setbackendStatus("sending");
      toast.info("Retrying drop finalization. Please stay on this page.");

      axios
        .post(`${BACKEND_URL}/users/add-bulk-user`, body_v, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        .then((response) => {
          console.log("Retry successful:", response);
          setbackendStatus("success");
          setShowModal(true);
          dispatch(setTokenDetail(null));
          clear();
        })
        .catch((error) => {
          console.error("Retry failed:", error);
          setbackendStatus("error");
        });

      return;
    }
    if (!tokenBalance) {
      return;
    }
    if (parseFloat(tokenBalance) < totalOutput) {
      toast.error("Insufficient balance to approve");
      return;
    }
    if (!tokenDetail?.decimals) {
      toast.error("Token details missing.");
      return;
    }

    const totalOutputInWei = ethers.parseUnits(
      totalOutput.toString(),
      tokenDetail?.decimals
    );
    // call approve
    const isApproved = await approveTransfer(totalOutputInWei.toString());
    if (!isApproved) {
      return;
    }
    const body = {
      tokenAddress,
      merkleRoot,
      name,
      nftAddress,
      totalOutputTokens: ethers.parseUnits(
        totalOutput.toString(),
        tokenDetail?.decimals
      ),
      noOfClaimers,
    };

    const { success, transactionHash, deployedAirdropContractAddress } =
      await createTokenDrop(
        body.tokenAddress,
        body.merkleRoot,
        body.name,
        body.nftAddress,
        body.noOfClaimers,
        body.totalOutputTokens
      );

    if (!success) {
      return;
    }
    if (!transactionHash) {
      return;
    }
    setTxHash(transactionHash);
    setDeployedAirdropContractAddress(deployedAirdropContractAddress);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const token = Cookies.get("token");
    const body_v = {
      proofs: merkleOutput,
      contractAddress: deployedAirdropContractAddress,
    };
    console.log(body_v);

    setbackendStatus("sending");

    toast.info("Please stay on this page until the drop is created.");
    axios
      .post(`${BACKEND_URL}/users/add-bulk-user`, body_v, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      .then((response) => {
        console.log("API call successful:", response);
        setbackendStatus("success");
        setShowModal(true);
        dispatch(setTokenDetail(null));
        clear();
      })
      .catch((error) => {
        console.error("API call failed:", error);
        setbackendStatus("error");
        toast.error("Finalization failed. Retry");
      });
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          className="w-full flex justify-center items-center text-white p-2"
          initial="initial"
          animate="final"
          exit="exit"
          key="yang"
          variants={moodVariant}
        >
          <div
            className="p-4 w-full lg:w-[400px] xl:w-[600px] border-[3px] border-[#FFFFFF17] rounded-xl"
            style={{ background: "#8989890D", backdropFilter: "blur(150px)" }}
          >
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="border-2 border-[#FFFFFF17] bg-transparent rounded-lg p-4">
                  <div className="font-bold text-white text-[20px]">
                    {tokenDetail?.symbol}
                  </div>
                  <div className="text-sm text-white/[0.8]">Token Symbol</div>
                </div>
                <div className="border-2 border-[#FFFFFF17] bg-transparent rounded-lg p-4">
                  <div className="font-bold text-white break-words overflow-hidden text-[20px] ">
                    {totalOutput?.toLocaleString()}
                  </div>
                  <div className="text-sm text-white/[0.8]">Total Output</div>
                </div>
                <div className="border-2 border-[#FFFFFF17] bg-transparent rounded-lg p-4">
                  <div className="font-bold text-white text-[20px]">
                    {noOfClaimers}
                  </div>
                  <div className="text-sm text-white/[0.8]">Recipients</div>
                </div>
                <div className="border-2 border-[#FFFFFF17] bg-transparent rounded-lg p-4">
                  <div className="font-bold text-white text-[20px]">
                    {isLoadingBalance ? (
                      <ButtonLoader />
                    ) : tokenBalance !== null ? (
                      parseFloat(tokenBalance).toLocaleString()
                    ) : (
                      "Invalid"
                    )}
                  </div>
                  <div className="text-sm text-white/[0.8]">Token balance</div>
                </div>
                <div className="border-2 border-[#FFFFFF17] bg-transparent rounded-lg p-4 col-span-2">
                  <div className="font-bold text-white text-[20px] text-center">
                    {name}
                  </div>
                  <div className="text-sm text-white/[0.8]">Drop Name</div>
                </div>
              </div>
              <div>
                <div className="mt-4">List of recipients</div>
                <div className="mb-8 h-[200px] overflow-y-auto p-2">
                  {csvToJSONData.map((recepients: any, index: number) => {
                    return (
                      <div className="flex items-start border-b-solid border-b-[1px] border-b-[#D0D5DD] py-4 gap-2 min-w-max w-full">
                        <p>{index + 1}.</p>
                        <div className="flex flex-col gap-2">
                          <p className="text-white truncate">
                            Address: {recepients.address}
                          </p>
                          <p className="text-white">
                            Amount: {recepients.amount}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <button
              className={`w-full bg-[#00A7FF] text-white py-2 rounded-[6px] transition ${
                isCreating || backendStatus == "sending"
                  ? "cursor-not-allowed opacity-70"
                  : ""
              }`}
              onClick={approve}
              disabled={
                isLoadingApproval ||
                isCreating ||
                backendStatus == "sending" ||
                backendStatus == "success"
              }
            >
              {isLoadingApproval || isCreating ? (
                <ButtonLoader />
              ) : backendStatus === "sending" ? (
                "Completing..."
              ) : creationStatus === "success" && backendStatus === "error" ? (
                "Retry drop finalization"
              ) : creationStatus === "success" &&
                backendStatus === "success" ? (
                "Done"
              ) : (
                "Approve"
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
      {showModal && <CompletedModal dropType="airdrop" txHash={txHash || ""} />}
    </>
  );
}
