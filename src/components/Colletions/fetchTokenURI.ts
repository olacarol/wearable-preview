import { ethers } from "ethers";

// Defina o endereço do contrato e o tokenId
const contractAddress = "0xf71043c61349ae15ce90C4A2D5d51592407c3557"; 
const tokenId = 111; // tokenId

// ABI (Interface do contrato) reduzida apenas para a função tokenURI
const abi = [
  "function tokenURI(uint256 tokenId) external view returns (string memory)"
];

export async function fetchTokenURI() {
  // Conectando ao provedor da Metamask
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(contractAddress, abi, provider);

  try {
    // Chama a função tokenURI
    const tokenURI = await contract.tokenURI(tokenId);
    console.log("Token URI:", tokenURI);
  } catch (error) {
    console.error("Erro ao buscar tokenURI:", error);
  }
}

// Execute a função
fetchTokenURI();
