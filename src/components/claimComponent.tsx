import { useEffect, useState } from "react";
import {
  claimCardVariants,
  moodVariant,
  parentVariant,
} from "../animations/animation";
import { copyToClipboard, formatAddress } from "../utils/helpers";
import ThreeDHoverWrapper from "./3dhover";
import {
  BackArrow,
  ButtonLoader,
  CalendarIcon,
  CheckedIcon,
  CopyIcon,
  FilledCopyIcon,
  InfoIcon,
} from "./icons";
import {
  ClaimModalStyles,
  DropCompStyle,
  FlexAbsoluteModalStyles,
} from "./styles/claimpage";
import ClickOutsideWrapper from "./outsideClick";
import { AnimatePresence } from "framer-motion";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { getPoapImageFromBaseURI } from "../utils/getImageFromBaseURI";
import { useReadPoapFunctions } from "../hooks/specific/poap/useReadPoapAirdrop";
import useCalculateGasCost, {
  GasInfo,
} from "../hooks/specific/useCalculateGas";
import { IDropComp } from "../interfaces/drop";
import { usePoapDropFunctions } from "../hooks/specific/poap/usePoapAirdrop";
import { ClaimDropToastMsg } from "./customToast";
import { toast } from "react-toastify";
import { generateTxExplorerLink } from "../utils/generateTxLink";
import { useAppDispatch } from "../store/hooks";
import { updateAllPoapsAfterClaim } from "../store/slices/poapDropDataSlice";
import { ethers } from "ethers";
import { useReadTokenFunctions } from "../hooks/specific/token/useReadTokenAirdrop";
import { useTokenDropFunctions } from "../hooks/specific/token/useTokenAirdrop";
import { updateAllTokenDropsAfterClaim } from "../store/slices/tokenDropDataSlice";
import { ITokenDetails, useTokenDetail } from "../hooks/specific/useERC20";

export const DropComp: React.FC<IDropComp> = ({
  name,
  creator,
  creationDate,
  endDate,
  totalParticipants,
  totalRewardClaimed,
  totalRewardPool,
  nftAddress,
  totalClaims,
  contractAddress,
  isEditable,
  hasUserClaimed,
  tokenContractAddress,
}) => {
  const [showModal, setShowModal] = useState(false);
  const percentageRaw = (totalRewardClaimed * 100) / totalRewardPool;
  const [percentClaimed] = useState(
    percentageRaw % 1 === 0
      ? percentageRaw.toFixed(0)
      : percentageRaw.toFixed(1)
  );
  const { address } = useAppKitAccount();

  const [gasInfo, setGasInfo] = useState<GasInfo | null>(null);
  const [isEligible, setIsEligible] = useState(false);

  const { checkTokenDropEligibility, isChecking } =
    useReadTokenFunctions(contractAddress);

  const { estimate, loadingGas } = useCalculateGasCost();

  const handleCheckEligibiltyOrView = async () => {
    if (isEditable) {
      setShowModal(true);
      return;
    }
    const { isEligible, gasToMint } = await checkTokenDropEligibility();
    if (!isEligible) {
      setShowModal(true);
      return;
    }
    if (!gasToMint) {
      setShowModal(true);
      return;
    }
    setIsEligible(isEligible); // user is eligible
    const gasData = await estimate(gasToMint);
    setGasInfo(gasData);
    setShowModal(true);
  };

  if (!tokenContractAddress) return;

  const { fetchDetailsWithoutRedux, isLoadingDetails } =
    useTokenDetail(tokenContractAddress);
  const [tokenDetails, setTokenDetails] = useState<ITokenDetails | null>(null);

  useEffect(() => {
    const fetchDeet = async () => {
      const tokenDetails = await fetchDetailsWithoutRedux();
      setTokenDetails(tokenDetails);
    };
    fetchDeet();
  }, []);
  return (
    <>
      <ThreeDHoverWrapper>
        <DropCompStyle
          className="w-full h-full"
          variants={claimCardVariants}
          initial="initial"
          viewport={{ once: true }}
          whileInView="final"
        >
          <div className="top">
            <div className="one">
              <div className="deet flex gap-[0.5rem]">
                <div className="img w-[2.5rem] h-[2.5rem]">
                  <img
                    src="/avatar.svg"
                    className="w-full h-full"
                    alt="random image"
                  />
                </div>
                <div className="flex flex-col">
                  <h4>{name}</h4>
                  <p>{formatAddress(creator)}</p>
                </div>
              </div>
              <div className="mt-[0.75rem] blu">
                <p>{totalParticipants.toLocaleString()} Participants</p>
              </div>
            </div>
            <div className="two flex justify-between gap-[1rem] flex-wrap">
              <div className="">
                <p className="">Reward Pool</p>
                {isLoadingDetails ? (
                  <ButtonLoader />
                ) : (
                  <h3>
                    {ethers.formatUnits(
                      totalRewardPool.toString(),
                      tokenDetails?.decimals
                    )}
                    {tokenDetails?.symbol}
                  </h3>
                )}
              </div>
              <div>
                <p>{endDate ? "ENDING DATE" : "CREATION DATE"}</p>
                <div className="flex items-center gap-[0.625rem] justify-end">
                  <CalendarIcon />
                  <h3>{endDate ? endDate : creationDate}</h3>
                </div>
              </div>
            </div>

            <div className="three">
              <div
                className={`rounded-md h-[0.75rem] flex items-center gap-[0.25rem] ${
                  parseInt(percentClaimed) !== 100
                    ? "bg-[#283245]"
                    : "bg-[rgba(157,211,175,0.28)] p-[0.25rem]"
                }`}
              >
                {parseInt(percentClaimed) !== 100 && (
                  <div
                    className="rounded-md inner h-[0.75rem] flex items-center justify-end pr-[0.75rem]"
                    style={{
                      width: `${percentClaimed}%`,
                    }}
                  >
                    {parseInt(percentClaimed) > 80 &&
                      parseInt(percentClaimed) !== 100 && (
                        <p className="mini">{percentClaimed}%</p>
                      )}
                  </div>
                )}
                {parseInt(percentClaimed) < 80 && (
                  <p className="tiny">{percentClaimed}%</p>
                )}
                {parseInt(percentClaimed) === 100 && (
                  <>
                    <CheckedIcon />
                    <p className="text-completed">Completed</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="btn">
            <button
              onClick={handleCheckEligibiltyOrView}
              disabled={!isEditable && (hasUserClaimed || isChecking)}
              className={`px-4 py-2 rounded text-white font-medium transition
    ${!isEditable && hasUserClaimed ? "cursor-not-allowed" : ""}
    ${!isEditable && (isChecking || loadingGas) ? "opacity-60 cursor-wait" : ""}
  `}
              style={
                !isEditable && hasUserClaimed
                  ? { backgroundColor: "#244b36" }
                  : undefined
              }
            >
              {!isEditable && (isChecking || loadingGas) ? (
                <ButtonLoader />
              ) : !isEditable && hasUserClaimed ? (
                "Claimed!"
              ) : isEditable ? (
                "View Airdrop"
              ) : (
                "Check Eligibility"
              )}
            </button>
          </div>
        </DropCompStyle>
      </ThreeDHoverWrapper>
      <AnimatePresence>
        {showModal && (
          <ClaimModal
            {...{
              name,
              creator,
              creationDate,
              endDate,
              totalParticipants,
              totalRewardClaimed,
              totalRewardPool,
              nftAddress,
              totalClaims,
              contractAddress,
              type: "token",
              isCreator:
                creator.toLowerCase() === address?.toLowerCase() && isEditable,
            }}
            closeModal={() => setShowModal(false)}
            gasInfo={gasInfo}
            isEligible={isEligible}
            tokenDetails={tokenDetails}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export const POAPDropComp: React.FC<IDropComp> = ({
  name,
  creator,
  creationDate,
  endDate,
  totalParticipants,
  totalRewardClaimed,
  totalRewardPool,
  totalClaims,
  contractAddress,
  isEditable,
  baseURI,
  hasUserClaimed,
}) => {
  const [showModal, setShowModal] = useState(false);
  const percentageRaw = (totalRewardClaimed * 100) / totalRewardPool;
  const [percentClaimed] = useState(
    percentageRaw % 1 === 0
      ? percentageRaw.toFixed(0)
      : percentageRaw.toFixed(1)
  );
  const { address } = useAppKitAccount();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [gasInfo, setGasInfo] = useState<GasInfo | null>(null);
  const [isEligible, setIsEligible] = useState(false);

  useEffect(() => {
    const fetchImage = async () => {
      if (!baseURI) {
        return;
      }
      const image = await getPoapImageFromBaseURI(baseURI);
      if (image) setImageUrl(image);
    };

    fetchImage();
  }, [baseURI]);

  const { checkEligibility, isChecking } =
    useReadPoapFunctions(contractAddress);
  const { estimate, loadingGas } = useCalculateGasCost();

  const handleCheckEligibiltyOrView = async () => {
    if (isEditable) {
      setShowModal(true);
      return;
    }
    const { isEligible, gasToMint } = await checkEligibility();
    if (!isEligible) {
      setShowModal(true);
      return;
    }
    if (!gasToMint) {
      setShowModal(true);
      return;
    }
    setIsEligible(isEligible); // user is eligible
    const gasData = await estimate(gasToMint);
    setGasInfo(gasData);
    setShowModal(true);
  };

  return (
    <>
      <ThreeDHoverWrapper>
        <DropCompStyle
          className="w-full h-full"
          variants={claimCardVariants}
          initial="initial"
          viewport={{ once: true }}
          whileInView="final"
        >
          <div className="poap-img">
            <img
              src={imageUrl ?? "/poap.avif"}
              className="w-full h-full"
              alt="POAP image"
            />
          </div>
          <div className="top">
            <div className="one">
              <div className="deet flex gap-[0.5rem]">
                <div className="img w-[2.5rem] h-[2.5rem]">
                  <img
                    src="/avatar.svg"
                    className="w-full h-full"
                    alt="random image"
                  />
                </div>
                <div className="flex flex-col">
                  <h4>{name}</h4>
                  <p>{formatAddress(creator)}</p>
                </div>
              </div>
              <div className="mt-[0.75rem] blu">
                <p>{totalParticipants.toLocaleString()} Participants</p>
              </div>
            </div>
            <div className="two flex justify-between gap-[1rem] flex-wrap">
              <div className="">
                <p className="">Reward Pool</p>
                <h3>{totalRewardPool.toLocaleString()}</h3>
              </div>
              <div>
                <p>{endDate ? "ENDING DATE" : "CREATION DATE"}</p>
                <div className="flex items-center gap-[0.625rem] justify-end">
                  <CalendarIcon />
                  <h3>{endDate ? endDate : creationDate}</h3>
                </div>
              </div>
            </div>

            <div className="three">
              <div
                className={`rounded-md h-[0.75rem] flex items-center gap-[0.25rem] ${
                  parseInt(percentClaimed) !== 100
                    ? "bg-[#283245]"
                    : "bg-[rgba(157,211,175,0.28)] p-[0.25rem]"
                }`}
              >
                {parseInt(percentClaimed) !== 100 && (
                  <div
                    className="rounded-md inner h-[0.75rem] flex items-center justify-end pr-[0.75rem]"
                    style={{
                      width: `${percentClaimed}%`,
                    }}
                  >
                    {parseInt(percentClaimed) > 80 &&
                      parseInt(percentClaimed) !== 100 && (
                        <p className="mini">{percentClaimed}%</p>
                      )}
                  </div>
                )}
                {parseInt(percentClaimed) < 80 && (
                  <p className="tiny">{percentClaimed}%</p>
                )}
                {parseInt(percentClaimed) === 100 && (
                  <>
                    <CheckedIcon />
                    <p className="text-completed">Completed</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="btn">
            <button
              onClick={handleCheckEligibiltyOrView}
              disabled={!isEditable && (hasUserClaimed || isChecking)}
              className={`px-4 py-2 rounded text-white font-medium transition
    ${!isEditable && hasUserClaimed ? "cursor-not-allowed" : ""}
    ${!isEditable && (isChecking || loadingGas) ? "opacity-60 cursor-wait" : ""}
  `}
              style={
                !isEditable && hasUserClaimed
                  ? { backgroundColor: "#244b36" }
                  : undefined
              }
            >
              {!isEditable && (isChecking || loadingGas) ? (
                <ButtonLoader />
              ) : !isEditable && hasUserClaimed ? (
                "Claimed!"
              ) : isEditable ? (
                "View POAP"
              ) : (
                "Check Eligibility"
              )}
            </button>
          </div>
        </DropCompStyle>
      </ThreeDHoverWrapper>
      <AnimatePresence>
        {showModal && (
          <ClaimModal
            {...{
              name,
              creator,
              creationDate,
              endDate,
              totalParticipants,
              totalRewardClaimed,
              totalRewardPool,
              totalClaims,
              contractAddress,
              type: "poap",
              isCreator:
                creator.toLowerCase() === address?.toLowerCase() && isEditable,
            }}
            closeModal={() => setShowModal(false)}
            poapImg={imageUrl ?? undefined}
            gasInfo={gasInfo}
            isEligible={isEligible}
          />
        )}
      </AnimatePresence>
    </>
  );
};

interface IClaimModal extends IDropComp {
  closeModal: () => void;
  type: "token" | "poap";
  isCreator?: boolean;
  poapImg?: string;
  gasInfo: GasInfo | null;
  isEligible: boolean;
  tokenDetails?: ITokenDetails | null;
}
export const ClaimModal: React.FC<IClaimModal> = ({
  closeModal,
  contractAddress,
  name,
  creator,
  nftAddress,
  creationDate,
  endDate,
  totalParticipants,
  totalRewardClaimed,
  totalRewardPool,
  totalClaims,
  type,
  isCreator,
  poapImg,
  isEligible,
  gasInfo,
  tokenDetails,
}) => {
  // for participants
  const participantPercentageRaw = (totalClaims * 100) / totalParticipants;
  const [participantPercentClaimed] = useState(
    participantPercentageRaw % 1 === 0
      ? participantPercentageRaw.toFixed(0)
      : participantPercentageRaw.toFixed(1)
  );

  // for rewards
  const rewardPercentageRaw = (totalRewardClaimed * 100) / totalRewardPool;
  const [rewardPercentageClaimed] = useState(
    rewardPercentageRaw % 1 === 0
      ? rewardPercentageRaw.toFixed(0)
      : rewardPercentageRaw.toFixed(1)
  );

  const { mintPoap, isMinting } = usePoapDropFunctions(contractAddress);
  const { claimTokenDrop, isClaiming } = useTokenDropFunctions(contractAddress);
  const { chainId } = useAppKitNetwork();

  const popMsg = (txHash: string) => {
    if (!chainId) {
      return;
    }
    const url = generateTxExplorerLink(chainId, txHash);

    toast((props) => <ClaimDropToastMsg {...props} />, {
      data: {
        text: "Minted sucessfully",
        url: url,
      },
    });
  };

  const dispatch = useAppDispatch();

  const handleClaim = async (dropType: "token" | "poap") => {
    if (dropType === "token") {
      // handle token claim
      console.log("claim the token drop");
      const { success, transactionHash, amountClaimed } =
        await claimTokenDrop();
      if (!success) {
        return;
      }
      if (!transactionHash) {
        return;
      }
      if (!amountClaimed) {
        return;
      }
      dispatch(
        updateAllTokenDropsAfterClaim({ contractAddress, amountClaimed })
      );
      popMsg(transactionHash);
      closeModal();
    } else if (dropType === "poap") {
      // handle poap claim
      console.log("mint the poap");
      const { success, transactionHash } = await mintPoap();

      if (!success) {
        return;
      }
      if (!transactionHash) {
        return;
      }
      dispatch(updateAllPoapsAfterClaim(contractAddress));
      console.log("total rewards in modal claimed -> ", totalRewardClaimed);

      popMsg(transactionHash);
      closeModal();
    }
  };
  const editAirdrop = (dropType: "token" | "poap") => {
    if (dropType === "token") {
      // handle edit token airdrop
    } else if (dropType === "poap") {
      // handle edit poap airdrop
    }
  };
  const endAirdrop = (dropType: "token" | "poap") => {
    if (dropType === "token") {
      // handle token airdrop end
    } else if (dropType === "poap") {
      // handle poap airdrop end
    }
  };
  const [isCreatorAddressCopied, setIsCreatorAddressCopied] = useState(false);
  const [isNftAddressCopied, setIsNftAddressCopied] = useState(false);

  return (
    <FlexAbsoluteModalStyles
      variants={parentVariant}
      initial="initial"
      animate="final"
    >
      <ClaimModalStyles
        key="inoske"
        variants={moodVariant}
        initial="initial"
        animate="final"
        exit="exit"
      >
        <ClickOutsideWrapper onClickOutside={closeModal}>
          <div className="modal overflow-y-auto max-h-[80vh] w-full max-w-[90vw] mx-auto px-4">
            <BackButton action={closeModal} />
            {type === "token" && (
              <div className="reward-pool flex flex-col items-center justify-center w-full">
                <p>Reward Pool</p>
                <h1>{ethers.formatUnits(totalRewardPool.toString(), 18)}ETH</h1>
              </div>
            )}
            {type === "poap" && (
              <div className="poap-img h-[12.625rem] md:h-[11.25rem] w-full rounded-[0.625rem]">
                <img
                  src={poapImg ?? "/poap.avif"}
                  className="w-full h-full rounded-[0.625rem]"
                  alt="POAP image"
                />
              </div>
            )}
            <div className="flex flex-col gap-[1rem] w-full">
              <div className="deet flex gap-[0.5rem]">
                <div className="img w-[2.5rem] h-[2.5rem]">
                  <img
                    src="/avatar.svg"
                    className="w-full h-full"
                    alt="random image"
                  />
                </div>
                <div className="flex flex-col">
                  <h4>{name}</h4>
                  <p>{formatAddress(creator)}</p>
                </div>
              </div>
              <div className="cards flex gap-[1rem] justify-between items-stretch">
                <div className="flex flex-col rounded-md bg-[#1E2430] gap-[0.625rem] p-[1rem] w-full">
                  <div className="flex flex-col">
                    <p>No Of Recipients</p>
                    <h4>{totalParticipants.toLocaleString()}</h4>
                  </div>
                  <div
                    className={`rounded-md h-[0.75rem] flex items-center gap-[0.25rem] ${
                      parseInt(participantPercentClaimed) !== 100
                        ? "bg-[#283245]"
                        : "bg-[rgba(157,211,175,0.28)] p-[0.25rem]"
                    }`}
                  >
                    {parseInt(participantPercentClaimed) !== 100 && (
                      <div
                        className="rounded-md inner h-[0.75rem] flex items-center justify-end pr-[0.75rem]"
                        style={{
                          width: `${participantPercentClaimed}%`,
                        }}
                      >
                        {parseInt(participantPercentClaimed) > 80 &&
                          parseInt(participantPercentClaimed) !== 100 && (
                            <p className="mini">{participantPercentClaimed}%</p>
                          )}
                      </div>
                    )}
                    {parseInt(participantPercentClaimed) < 80 && (
                      <p className="tiny">{participantPercentClaimed}%</p>
                    )}
                    {parseInt(participantPercentClaimed) === 100 && (
                      <>
                        <CheckedIcon />
                        <p className="text-completed">Completed</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col rounded-md bg-[#1E2430] gap-[0.625rem] p-[1rem] w-full">
                  <div className="flex flex-col">
                    <p>Rewards Claimed</p>
                    <h4>
                      {ethers.formatUnits(totalRewardClaimed.toString(), 18)}
                      {type === "token" && "ETH"}
                    </h4>
                  </div>
                  {isCreator && (
                    <div
                      className={`rounded-md h-[0.75rem] flex items-center gap-[0.25rem] ${
                        parseInt(rewardPercentageClaimed) !== 100
                          ? "bg-[#283245]"
                          : "bg-[rgba(157,211,175,0.28)] p-[0.25rem]"
                      }`}
                    >
                      {parseInt(rewardPercentageClaimed) !== 100 && (
                        <div
                          className="rounded-md inner h-[0.75rem] flex items-center justify-end pr-[0.75rem]"
                          style={{
                            width: `${rewardPercentageClaimed}%`,
                          }}
                        >
                          {parseInt(rewardPercentageClaimed) > 80 &&
                            parseInt(rewardPercentageClaimed) !== 100 && (
                              <p className="mini">{rewardPercentageClaimed}%</p>
                            )}
                        </div>
                      )}
                      {parseInt(rewardPercentageClaimed) < 80 && (
                        <p className="tiny">{rewardPercentageClaimed}%</p>
                      )}
                      {parseInt(rewardPercentageClaimed) === 100 && (
                        <>
                          <CheckedIcon />
                          <p className="text-completed">Completed</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="addy flex items-center justify-between gap-[1rem]">
                <div className="flex flex-col w-[70%]">
                  <h4>Creator Address</h4>
                  <p className="break-words">{creator}</p>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <button
                    onClick={() =>
                      copyToClipboard(creator, () =>
                        setIsCreatorAddressCopied(true)
                      )
                    }
                  >
                    {isCreatorAddressCopied ? <FilledCopyIcon /> : <CopyIcon />}
                  </button>
                </div>
              </div>
              {nftAddress && (
                <div className=" addy flex items-center justify-between">
                  <div className="flex flex-col w-[70%]">
                    <h4>NFT Address</h4>
                    <p className="break-words">{nftAddress}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <button
                      onClick={() =>
                        copyToClipboard(nftAddress, () =>
                          setIsNftAddressCopied(true)
                        )
                      }
                    >
                      {isNftAddressCopied ? <FilledCopyIcon /> : <CopyIcon />}
                    </button>
                  </div>
                </div>
              )}
              {nftAddress && (
                <div className="required flex items-center gap-[0.25rem]">
                  <InfoIcon />
                  <p>NFT is required to claim Airdrop</p>
                </div>
              )}
              {tokenDetails && (
                <div className="flex items-stretch justify-between gap-[1rem]">
                  <div className="flex flex-col addy">
                    <h4>Token Name</h4>
                    <div className="flex items-center gap-[0.25rem]">
                      <p className="whitespace-normal">{tokenDetails.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-col addy">
                    <h4>Token Symbol</h4>
                    <div className="flex items-center justify-end gap-[0.25rem]">
                      <p className="whitespace-normal">{tokenDetails.symbol}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-stretch justify-between gap-[1rem]">
                <div className="flex flex-col addy">
                  <h4>{endDate ? "End Date" : "Creation Date"}</h4>
                  <div className="flex items-center gap-[0.25rem]">
                    <CalendarIcon />
                    <p className="whitespace-normal">
                      {endDate ? endDate : creationDate}
                    </p>
                  </div>
                </div>
              </div>
              <div className=" addy flex items-center justify-between w-full">
                <div className="flex items-center justify-between w-full">
                  <h4>Estimated Gas Fee</h4>
                  {gasInfo ? (
                    <p className="break-words">
                      {gasInfo.nativeWithToken} &asymp; {gasInfo.usd}
                    </p>
                  ) : (
                    <p className="break-words">N/A</p>
                  )}
                </div>
              </div>
            </div>
            {!isCreator && (
              <div className="btn flex w-full justify-center items-center gap-[1rem]">
                <button
                  onClick={() => handleClaim(type)}
                  disabled={!isEligible || isMinting || isClaiming}
                  className={`transition
                  ${!isEligible ? "bg-red-500 cursor-not-allowed" : ""}
                  ${isMinting || (isClaiming && "opacity-60 cursor-wait")}`}
                >
                  {isMinting ? (
                    <ButtonLoader />
                  ) : isClaiming ? (
                    <ButtonLoader />
                  ) : !isEligible ? (
                    "Not Eligible!"
                  ) : type === "token" ? (
                    "Claim Airdrop"
                  ) : (
                    "Mint POAP"
                  )}
                </button>
              </div>
            )}
            {isCreator && (
              <div className="btn flex w-full justify-between items-center gap-[1rem]">
                <button onClick={() => editAirdrop(type)}>
                  {type === "token" ? "Edit Airdrop" : "Edit POAP"}
                </button>
                <button onClick={() => endAirdrop(type)} className="second-btn">
                  {type === "token" ? "End Airdrop" : "End POAP"}
                </button>
              </div>
            )}
          </div>
        </ClickOutsideWrapper>
      </ClaimModalStyles>
    </FlexAbsoluteModalStyles>
  );
};

interface IFunctionComp {
  action: () => void;
}
export const BackButton: React.FC<IFunctionComp> = ({ action }) => {
  return (
    <button onClick={action} className="flex items-center gap-[0.25rem]">
      <BackArrow />
      <p>Back</p>
    </button>
  );
};
