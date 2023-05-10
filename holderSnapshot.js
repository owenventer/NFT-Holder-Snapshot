const axios = require("axios");
const fs = require("fs");

//Helius URL
const mintListURL = `https://api.helius.xyz/v1/mintlist?api-key=<api_key>`;

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

//Helius RPC URL
const rpcURL = `https://rpc.helius.xyz/?api-key=<api_key>`;
//Helper function to get the owner of the mint
const getHolder = async (address) => {
  const assetID = address;
  const { data } = await axios.post(rpcURL, {
    jsonrpc: "2.0",
    id: "my-id",
    method: "getAsset",
    params: [assetID],
  });
  const owner = data.result.ownership.owner;
  return owner;
};

//Helper function to create a list of holders
const createHolderList = async () => {
  const tempArray = [];
  const mintArray = await getMintlist();
  console.log(mintArray);
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
  console.log(tempArray);
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

//Save function to save the holders to a json file
const saveHolders = async () => {
  const holderArray = await createHolderList();
  const data = JSON.stringify(holderArray);

  fs.writeFile("holders.json", data, (err) => {
    if (err) throw err;
    console.log("Data saved to file");
  });
};

saveHolders();
