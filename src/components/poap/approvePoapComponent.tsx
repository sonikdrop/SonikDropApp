import { useEffect, useState } from "react";

import { moodVariant } from "../../animations/animation";
import { motion, AnimatePresence } from "framer-motion";
import { ButtonLoader } from "../icons";
import { CompletedModal } from "../completedModal";
import { ICSV, IPoapEvent } from "../../interfaces/CSVInterface";
import { useClearPoapFormInput } from "../../hooks/useClearPoapForm";
import { useAppSelector } from "../../store/hooks";

import { usePoapFactoryFunctions } from "../../hooks/specific/poap/usePoapFactory";
import { ethers } from "ethers";
import useCalculateGasCost, {
  GasInfo,
} from "../../hooks/specific/useCalculateGas";
import axios from "axios";
import Cookies from "js-cookie";
import {
  selectNoOfPoapClaimers,
  selectPoapMerkleHash,
  selectPoapMerkleOutput,
} from "../../store/slices/poapDropDataSlice";

export function ApprovePoapComponent() {
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventSymbol, setEventSymbol] = useState("");
  const [baseURI, setBaseURI] = useState("");

  const [csvToJSONData, setCSVToJSONData] = useState<ICSV[]>([]);

  const [gasInfo, setGasInfo] = useState<GasInfo>({
    native: "N/A",
    usd: "N/A",
    nativeWithToken: "N/A",
  });

  const merkleRoot = useAppSelector(selectPoapMerkleHash);
  const merkleOutput = useAppSelector(selectPoapMerkleOutput);
  const noOfClaimers = useAppSelector(selectNoOfPoapClaimers);

  const {
    estimateCreatePoapGas,
    isEstimating,
    createPoapDrop,
    isCreating,
    poapFactoryContract,
    deployedPoapDropContractAddress,
    transactionHash,
  } = usePoapFactoryFunctions();

  const { estimate } = useCalculateGasCost();

  useEffect(() => {
    const csvData: ICSV[] = JSON.parse(
      sessionStorage.getItem("csvData") as any
    );

    setCSVToJSONData(csvData);

    const poapEventDetails = sessionStorage.getItem("poapEventDetails");

    if (poapEventDetails) {
      const parsedPoapEventDetails: IPoapEvent = JSON.parse(poapEventDetails);

      setEventName(parsedPoapEventDetails.eventName);
      setEventType(parsedPoapEventDetails.eventType);
      setEventSymbol(parsedPoapEventDetails.tokenSymbol);
      setBaseURI(parsedPoapEventDetails.JSONIPFSHash);
    }
  }, []);

  useEffect(() => {
    const nftAddress = ethers.ZeroAddress;
    if (!poapFactoryContract) {
      return;
    }

    const fetchPoapGasEstimate = async () => {
      const gas = await estimateCreatePoapGas(
        merkleRoot,
        eventName,
        eventSymbol,
        baseURI,
        nftAddress,
        noOfClaimers
      );
      if (!gas) {
        return;
      }
      const gasData = await estimate(gas);
      if (!gasData) {
        return;
      }
      setGasInfo(gasData);
    };
    if (poapFactoryContract && merkleRoot && eventName && noOfClaimers > 0) {
      fetchPoapGasEstimate();
    }
  }, [poapFactoryContract]);

  const { clearPoap } = useClearPoapFormInput();
  const [showModal, setShowModal] = useState(false);

  const approve = async () => {
    // call contract
    // no nft is required to claim poap yet
    const nftAddress = ethers.ZeroAddress;

    const isCreated = await createPoapDrop(
      merkleRoot,
      eventName,
      eventSymbol,
      baseURI,
      nftAddress,
      noOfClaimers
    );

    if (!isCreated) {
      return;
    }
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const token = Cookies.get("token");
    const body = {
      proofs: merkleOutput,
      contractAddress: deployedPoapDropContractAddress,
    };
    setShowModal(true);

    axios
      .post(`${BACKEND_URL}/users/add-bulk-user`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      .then((response) => {
        console.log("API call successful:", response);
      })
      .catch((error) => {
        console.error("API call failed:", error);
      });

    setTimeout(() => {
      setShowModal(true);
    }, 1200);

    clearPoap();
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
                    {eventName}
                  </div>
                  <div className="text-sm text-white/[0.8]">POAP Name</div>
                </div>
                <div className="border-2 border-[#FFFFFF17] bg-transparent rounded-lg p-4">
                  <div className="font-bold text-white break-words overflow-hidden text-[20px] ">
                    {eventType[0]?.toLocaleUpperCase() + eventType?.slice(1)}
                  </div>
                  <div className="text-sm text-white/[0.8]">POAP Type</div>
                </div>
                <div className="border-2 border-[#FFFFFF17] bg-transparent rounded-lg p-4">
                  <div className="font-bold text-white text-[20px]">
                    {noOfClaimers}
                  </div>
                  <div className="text-sm text-white/[0.8]">Recipients</div>
                </div>
                <div className="border-2 border-[#FFFFFF17] bg-transparent rounded-lg p-4">
                  <div className="font-bold text-white text-[20px]">
                    {isEstimating ? <ButtonLoader /> : `${gasInfo.usd}`}
                  </div>
                  <div className="text-sm text-white/[0.8]">Gas Estimate</div>
                </div>
              </div>
              <div>
                <div className="mt-4">List of recipients</div>
                <div className="mb-8 h-[200px] overflow-y-auto p-2">
                  {csvToJSONData?.map((recepients: any, index: number) => {
                    return (
                      <div className="flex items-start border-b-solid border-b-[1px] border-b-[#D0D5DD] py-4 gap-2 min-w-max w-full">
                        <p>{index + 1}.</p>
                        <div className="flex flex-col gap-2">
                          <p className="text-white truncate">
                            {recepients.address}
                          </p>
                          {/* <p className="text-white">
                            Amount: {recepients.amount}
                          </p> */}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <button
              className={`w-full bg-[#00A7FF] text-white py-2 rounded-[6px] transition ${
                isCreating ? "cursor-not-allowed opacity-70" : ""
              }`}
              onClick={approve}
            >
              {isCreating ? <ButtonLoader /> : "Approve"}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
      {showModal && <CompletedModal dropType="poap" txHash={transactionHash} />}
    </>
  );
}
