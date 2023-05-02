const axios = require("axios");
const fs = require("fs");
const web3 = require("@solana/web3.js");

//Solana connection using Helius RPC
const connection = new web3.Connection(
  "https://rpc.helius.xyz/?api-key=<api_key>",
  "confirmed"
);

//Helius URLS
const mintListURL = `https://api.helius.xyz/v1/mintlist?api-key=<api_key>`;
const activeListingsURL = `https://api.helius.xyz/v1/active-listings?api-key=<api_key>`;

//get all the minted NFTs
const getMintlist = async () => {
  const { data } = await axios.post(mintListURL, {
    query: {
      // SMB
      firstVerifiedCreators: ["mdaoxg4DVGptU4WSpzGyVpK3zqsgn7Qzx5XNgWTcEA2"],
    },
    options: {
      limit: 5000,
    },
  });

  return data.result;
};

//Helper function to get the holder each NFT
const getHolder = async (address) => {
  const pubKey = new web3.PublicKey(address);
  const largestAccounts = await connection.getTokenLargestAccounts(pubKey);
  const largestAccountInfo = await connection.getParsedAccountInfo(
    largestAccounts.value[0].address
  );
  var owner = largestAccountInfo.value.data.parsed.info.owner;

  return owner;
};

//Helper function to compile a list of holders
const compileHolders = async () => {
  const tempArray = [];
  const mintArray = await getMintlist();
  const mintArrayMapped = mintArray.map((item) => item.mint);

  //break the array into chunks of 200
  const chunks = chunk(mintArrayMapped, 200);

  //loop through the chunks and get the owner of each mint
  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (mint) => {
        const owner = await getHolder(mint);

        tempArray.push(owner);
        return owner;
      })
    );
  }
  return tempArray;
};

//Helper function to break the array into chunks of 200
const chunk = (array, size) => {
  const chunked = [];
  let index = 0;
  while (index < array.length) {
    chunked.push(array.slice(index, size + index));
    index += size;
  }
  return chunked;
};

//get all the listed NFTs
const getActiveListings = async () => {
  const { data } = await axios.post(activeListingsURL, {
    query: {
      // SMB
      firstVerifiedCreators: ["mdaoxg4DVGptU4WSpzGyVpK3zqsgn7Qzx5XNgWTcEA2"],
    },
  });
  return data;
};

//remove all the listed NFTs from the holders array
const removeListedNFTs = async () => {
  const listedNFTs = (await getActiveListings()).result;
  const sellerArray = [];
  console.log("Got Listed NFTs");
  var holderArray = await compileHolders();

  // loop through listedNFTs and extract seller addresses
  for (let i = 0; i < listedNFTs.length; i++) {
    const seller = listedNFTs[i].activeListings[0].seller;
    sellerArray.push(seller);
  }
  //Remove the ME wallet
  holderArray = holderArray.filter(
    (string) => string !== "1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix"
  );
  //Remove the listed NFTs
  for (let i = 0; i < holderArray.length; i++) {
    for (let j = 0; j < sellerArray.length; j++) {
      if (holderArray[i] === sellerArray[j]) {
        holderArray.splice(i, 1);
        sellerArray.splice(j, 1);
        i--;
        break;
      }
    }
  }
  return holderArray;
};

//Save function to save the holders to a json file
const saveHolders = async () => {
  const holderArray = await removeListedNFTs();
  const data = JSON.stringify(holderArray);

  //write to file
  fs.writeFile("holdersNoListing.json", data, (err) => {
    if (err) throw err;
    console.log("Data saved to file");
  });
};

saveHolders();
