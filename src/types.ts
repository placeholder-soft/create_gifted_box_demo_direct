export enum EVMNftTokenType {
  ERC721 = "ERC721",
  ERC1155 = "ERC1155",
}

export type ArtworkNFT = {
  contract: string;
  type: EVMNftTokenType;
  token_id: string;
  image: string;
  animation_url?: string;
  mediaUrl: string;
  posterUrl?: string;
  mediaMetadata: {
    width: number;
    height: number;
    contentType: string;
    posterUrl?: string;
  };
};

interface Owner {
  owner_address: string;
  quantity: number;
  quantity_string: string;
}
interface Contract {
  type: EVMNftTokenType;
}

export type Properties = {
  height: number;
  mime_type: string;
  width: number;
};

export type NFT = {
  name: string;
  description: string;
  contract_address: string;
  token_id: string;
  image_url: string;
  video_url: string;
  contract: Contract;
  owners: Owner[];
  image_properties: Properties | null;
  video_properties: Properties | null;
  extra_metadata: {
    animation_original_url?: string;
  };
};
