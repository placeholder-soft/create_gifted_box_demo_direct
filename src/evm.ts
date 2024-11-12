import { ArtworkNFT, NFT } from "./types";
import { Chain as simplehashChain, createApi } from "simplehash-api";
import { isAddressEqual } from "viem";
import { EVMChainName } from "./contract.interface";

const convertIpfsMediaUrl = (url: string) => {
  if (url.startsWith("ipfs://ipfs/")) {
    const cid = url.split("ipfs://ipfs/").pop();
    return `https://ipfs-gateway.myfilebase.com/ipfs/${cid}`;
  } else if (url.startsWith("ipfs://")) {
    const cid = url.split("ipfs://").pop();
    return `https://ipfs-gateway.myfilebase.com/ipfs/${cid}`;
  }
  return url;
};

function parseEVMNFT(nft: NFT): ArtworkNFT {
  const {
    image_url,
    video_url,
    image_properties,
    video_properties,
    extra_metadata,
    contract,
  } = nft;
  const normalizedImageUrl = image_url
    ? convertIpfsMediaUrl(image_url)
    : image_url;

  const resultVideoUrl = video_url ?? extra_metadata?.animation_original_url;

  const normalizedAnimationUrl = resultVideoUrl
    ? convertIpfsMediaUrl(resultVideoUrl)
    : resultVideoUrl;

  const posterUrl = normalizedAnimationUrl ? normalizedImageUrl : undefined;
  const mediaUrl = normalizedAnimationUrl || normalizedImageUrl;
  const properties = resultVideoUrl ? video_properties : image_properties;

  return {
    type: contract.type,
    token_id: nft.token_id,
    contract: nft.contract_address,
    image: normalizedImageUrl,
    animation_url: normalizedAnimationUrl,
    mediaUrl,
    posterUrl,
    mediaMetadata: {
      ...properties,
      width: properties?.width ?? 0,
      height: properties?.height ?? 0,
      posterUrl,
      contentType: properties?.mime_type ?? "text/html",
    },
  };
}

const simpleHash = createApi("keyp_sk_dzqyfx79zfvsjn0jv8ayoay0kh3bf91r");

const EVMChainMapToSimpleHashChain: { [key in EVMChainName]: simplehashChain } =
  {
    ethereum: "ethereum",
    sepolia: "ethereum-sepolia",
    base: "base",
    // @ts-ignore
    base_sepolia: "base-sepolia",
    arbitrum: "arbitrum",
    // @ts-ignore
    arbitrum_sepolia: "arbitrum-sepolia",
  };

export async function getNFTsByOwner({
  chain,
  owner,
  contract,
  token_id,
}: {
  chain: EVMChainName;
  owner: string;
  contract: string;
  token_id?: string;
}) {
  const nfts = await simpleHash.nftsByOwners(
    [EVMChainMapToSimpleHashChain[chain]],
    [owner]
  );

  return nfts
    .filter((nft) =>
      isAddressEqual(nft.contract_address as any, contract as any)
    )
    .filter((nft) => (token_id ? nft.token_id === token_id : true))
    .map((nft) => parseEVMNFT(nft as any));
}
