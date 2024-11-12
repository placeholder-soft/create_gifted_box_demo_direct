import fetch from "node-fetch";
import { getNFTsByOwner } from "./evm";
import { ArtworkNFT } from "./types";
import { env } from "./env";
import { EVMChainName } from "./contract.interface";
import { Contract } from "./contract";

const getUserInfo = async () => {
  const res = await fetch(`${env().api_url}/api/v1/auth/me`, {
    headers: {
      "x-api-key": env().api_key,
    },
  });

  return (await res.json()) as {
    chain_name: EVMChainName;
    address: string;
  };
};

const getAddressByEmail = async (email: string) => {
  const res = await fetch(`${env().api_url}/api/v1/auth/address`, {
    body: JSON.stringify({ email }),
  });

  return (await res.json()) as {
    address: string;
  };
};

// Function to create a gift box
const createGiftBoxTask = async (
  recipient: {
    email: string;
    first_name: string;
    last_name: string;
  },
  artwork_nft: ArtworkNFT
) => {
  const res = await fetch(`${env().api_url}/api/v1/tasks/ready`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Using staging environment API key, if you want to use prod environment, you need to use prod API key
      "x-api-key": env().api_key,
    },
    body: JSON.stringify([
      {
        args: {
          recipient,
          artworks: [
            {
              // NFT-related information
              nft_contract: artwork_nft.contract,
              token_id: artwork_nft.token_id,
              source: artwork_nft.mediaUrl,
              source_metadata: artwork_nft.mediaMetadata,
              minted_on: new Date().toISOString(),

              // Artist and artwork information
              artist_name: "Annibale Siconolfi",
              artist_description: "",
              artist_avatar:
                "https://ipfs.pixura.io/ipfs/QmaQhxcVm8GeCK9355qBxpEERXNe5avaLHbZwGnY3vhHJq/hidden%20city.jpg",
              artwork_name: "Demo Artwork name",
              artwork_description: "Demo Artwork description",

              type: artwork_nft.type,
              // Only support 1, indicating one 1155/721 NFT
              amount: 1,
            },
          ],
          // Gift box configuration
          gift_box: {
            // Text display for corresponding positions on the page
            note_subject: "To test",
            message: "Thank you for joining Gifted.art",
            message_bless: " ",
            signature: "—Gifted.art Team",

            // UI-related configurations for the page
            // Wrapping animation, if you need more, please go to https://app.gifted.art/, follow the process to send a gift, and you can see more wrapping styles at the last step
            wrapping: "Silver Elegance",
          },
        },
      },
    ]),
  });

  if (!res.ok) {
    const data = await res.json();
    console.error(res.statusText);
    console.error(JSON.stringify(data, null, 2));
    return;
  }

  // return task id
  console.log(await res.text());
};

const main = async () => {
  const user = await getUserInfo();
  const contract = new Contract(user.chain_name, env().private_key);

  const account = contract.getWalletClient().account;

  // We fetched a random NFT from NFTVault here. You should mint and send your NFT into NFVault and then call gifted’s API to have it sent out.
  const nfts = await getNFTsByOwner({
    chain: user.chain_name,
    owner: account.address,
    // base-sepolia 1155 contract address (if you want to send 721 NFT, you need to use the 721 contract address)
    contract: "0x2Faa4ff5Ee8D3D47915ABe87Ae44f550448A4CB0",
  });

  if (nfts.length === 0) {
    console.error("No NFTs found");
    return;
  }

  const nft = nfts[0];

  const recipient = {
    email: "test1@keyp.dev",
    first_name: "keyp",
    last_name: "test",
  };

  const recipientAddress = (await getAddressByEmail(recipient.email)).address;

  const mint_gift_box_transaction_hash = await contract.mintGiftBox({
    sender: user.address,
    recipient: recipientAddress,
  });

  await contract.waitForTransactionReceipt(mint_gift_box_transaction_hash);

  const gift_token_id = await contract.getGiftBoxTokenByHash(
    mint_gift_box_transaction_hash
  );

  const transfer_transaction_hash = await contract.transferTokenToGiftBox({
    token_contract_address: nft.contract,
    token_id: nft.token_id,
    type: nft.type,
    gift_token_id: gift_token_id,
  });

  await contract.waitForTransactionReceipt(transfer_transaction_hash);

  await createGiftBoxTask(recipient, nft);
};

// Execute the main function and catch any errors
main().catch(console.error);
