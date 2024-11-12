import {
  Address,
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  getAddress,
  http,
  NonceManager,
  createNonceManager,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  EVMChainMap,
  EVMChainName,
  MintGiftBox,
  TransferTokenToGiftBox,
} from "./contract.interface";
import { env } from "./env";
import fetch from "node-fetch";
import memoizee from "memoizee";
import { giftedBox } from "./abi/GiftedBox";
import { ERC721 } from "./abi/ERC721";
import { jsonRpc } from "viem/nonce";
import { ERC1155 } from "./abi/ERC1155";

export class Contract {
  private readonly nonceManager: NonceManager;

  chain_name: EVMChainName;
  private_key: string;
  rpc_url?: string;

  constructor(chain_name: EVMChainName, private_key: string, rpc_url?: string) {
    this.chain_name = chain_name;
    this.private_key = private_key;
    this.rpc_url = rpc_url;

    this.nonceManager = createNonceManager({
      source: jsonRpc(),
    });
  }

  getPublicClient() {
    return createPublicClient({
      chain: EVMChainMap[this.chain_name],
      transport: this.rpc_url ? http(this.rpc_url) : http(),
    });
  }

  getWalletClient() {
    return createWalletClient({
      chain: EVMChainMap[this.chain_name],
      account: privateKeyToAccount(`0x${this.private_key}`, {
        nonceManager: this.nonceManager,
      }),
      transport: this.rpc_url ? http(this.rpc_url) : http(),
    });
  }

  getGiftedContractAddresses = memoizee(
    async () => {
      const res = await fetch(
        `${env().api_url}/api/v1/contracts/gifted-contract-addresses`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": env().api_key,
          },
        }
      );

      const data = await res.json();

      return data as {
        UnifiedStore: string;
        GiftedAccountGuardian: string;
        GiftedAccount: string;
        GiftedBox: string;
        ERC6551Registry: string;
        Vault: string;
        GasSponsorBook: string;
      };
    },
    {
      promise: true,
      maxAge: 24 * 60 * 60 * 1000,
    }
  );

  private async simulateMintGiftBox({ sender, recipient }: MintGiftBox) {
    const publicClient = this.getPublicClient();
    const account = this.getWalletClient().account;

    const { GiftedBox } = await this.getGiftedContractAddresses();

    try {
      const operator = account.address;

      const { request } = await publicClient.simulateContract({
        account,
        address: GiftedBox as Address,
        abi: giftedBox.abi,
        functionName: "sendGift",
        args: [sender as Address, recipient as Address, operator as Address],
      });

      return request;
    } catch (error) {
      throw new Error(`EVM SimulateMintGiftBox: ${error}`);
    }
  }

  async mintGiftBox(data: MintGiftBox): Promise<string> {
    const request = await this.simulateMintGiftBox(data);

    const walletClient = this.getWalletClient();

    try {
      const transaction_hash = await walletClient.writeContract(request as any);

      return transaction_hash;
    } catch (error) {
      throw new Error(`EVM MintGiftBox: ${error}`);
    }
  }

  async waitForTransactionReceipt(hash: string) {
    const publicClient = this.getPublicClient();

    const res = await publicClient.waitForTransactionReceipt({
      hash: hash as Address,
    });

    if (res.status === "reverted") {
      throw new Error(`Transaction reverted: ${hash}`);
    }
  }

  async getGiftBoxTokenByHash(hash: string): Promise<string> {
    const publicClient = this.getPublicClient();

    const { GiftedBox } = await this.getGiftedContractAddresses();

    const transaction = await publicClient.waitForTransactionReceipt({
      hash: hash as Address,
    });

    if (!transaction.to || getAddress(transaction.to) !== GiftedBox) {
      throw new Error(
        `Transaction to ${transaction.to}, expected ${GiftedBox}`
      );
    }

    const logs = transaction.logs;
    const [transferLog] = logs;

    if (transferLog == null) {
      throw new Error(`NoTransferLogFoundError: ${hash}`);
    }

    const { args } = decodeEventLog({
      abi: giftedBox.abi,
      eventName: "GiftedBoxSentToVault",
      data: transferLog.data,
      topics: transferLog.topics,
    });

    if (args == null || args.tokenId == null) {
      throw new Error(`tokenId not found in ${hash}`);
    }

    return args.tokenId.toString();
  }

  private async simulateTransferTokenToGiftBox({
    token_id,
    amount,
    token_contract_address,
    type,
    gift_token_id,
  }: TransferTokenToGiftBox) {
    const publicClient = this.getPublicClient();
    const account = this.getWalletClient().account;

    const { GiftedBox } = await this.getGiftedContractAddresses();

    const token_account_address = await publicClient.readContract({
      address: GiftedBox as Address,
      abi: giftedBox.abi,
      functionName: "tokenAccountAddress",
      args: [BigInt(gift_token_id)],
    });

    try {
      const request = await (async () => {
        switch (type) {
          case "ERC721": {
            const { request } = await publicClient.simulateContract({
              account,
              address: token_contract_address as Address,
              abi: ERC721.abi,
              functionName: "safeTransferFrom",
              args: [account.address, token_account_address, token_id],
            });
            return request;
          }
          case "ERC1155": {
            if (amount == null) {
              throw new Error(`InvalidAmount: ${amount}`);
            }
            const { request } = await publicClient.simulateContract({
              account,
              address: token_contract_address as Address,
              abi: ERC1155.abi,
              functionName: "safeTransferFrom",
              args: [
                account.address,
                token_account_address,
                token_id,
                BigInt(amount),
                "0x",
              ],
            });
            return request;
          }
          default:
            throw new Error(`InvalidTokenType: ${type}`);
        }
      })();

      return request;
    } catch (error) {
      throw new Error(`EVM SimulateTransferTokenToGiftBox : ${error}`);
    }
  }

  async transferTokenToGiftBox(data: TransferTokenToGiftBox): Promise<string> {
    const request = await this.simulateTransferTokenToGiftBox(data);

    const walletClient = this.getWalletClient();

    try {
      const transaction_hash = await walletClient.writeContract(request as any);

      return transaction_hash;
    } catch (error) {
      throw new Error(`EVM TransferTokenToGiftBox: ${error}`);
    }
  }
}
