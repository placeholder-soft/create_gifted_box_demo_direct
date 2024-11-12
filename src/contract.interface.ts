import { Chain } from "viem";
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  mainnet,
  sepolia,
} from "viem/chains";
import { z } from "zod";

export const EVMChainNameSchema = z.enum([
  "ethereum",
  "sepolia",
  "base",
  "base_sepolia",
  "arbitrum",
  "arbitrum_sepolia",
]);

export type EVMChainName = z.infer<typeof EVMChainNameSchema>;

export const EVMChainMap: { [key in EVMChainName]: Chain } = {
  ethereum: mainnet,
  sepolia: sepolia,
  base: base,
  base_sepolia: baseSepolia,
  arbitrum: arbitrum,
  arbitrum_sepolia: arbitrumSepolia,
};

const EVMChainConfigSchema = z.object({
  private_key: z.string(),
  unified_store_address: z.string(),
});

export type EVMChainConfig = z.infer<typeof EVMChainConfigSchema>;

export const MintGiftBoxSchema = z.object({
  sender: z.string(),
  recipient: z.string(),
});

export type MintGiftBox = z.infer<typeof MintGiftBoxSchema>;

export const EVMTokenTypeSchema = z.enum([
  "GAS_TOKEN",
  "ERC20",
  "ERC721",
  "ERC1155",
]);
export type EVMTokenType = z.infer<typeof EVMTokenTypeSchema>;

export const TransferTokenToGiftBoxSchema = z.object({
  token_contract_address: z.string(),
  token_id: z.string(),
  amount: z.number().optional(),
  type: EVMTokenTypeSchema,
  gift_token_id: z.string(),
});

export type TransferTokenToGiftBox = z.infer<
  typeof TransferTokenToGiftBoxSchema
>;
