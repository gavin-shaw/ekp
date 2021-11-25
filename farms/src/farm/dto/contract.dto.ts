/**
 * @typedef ContractDto
 * @property {string} abi the full abi of the farm contract
 * @property {string} address the address of the contract
 * @property {string} name the name of the contract as per etherscan / bsc scan
 * @property {string} source the source code of the contract (sol)
 */

export interface ContractDto {
  abi?: string;
  address: string;
  name: string;
  source: string;
}
